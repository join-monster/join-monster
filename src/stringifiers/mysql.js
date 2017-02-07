import { validateSqlAST, inspect, maybeQuote } from '../util'
import { joinPrefix } from './shared'

export default async function stringifySqlAST(topNode, context, batchScope) {
  validateSqlAST(topNode)
  // recursively determine the selections, joins, and where conditions that we need
  let { selections, joins, wheres } = await _stringifySqlAST(null, topNode, [], context, [], [], [], batchScope)

  // make sure these are unique by converting to a set and then back to an array
  // defend against things like `SELECT user.id AS id, user.id AS id...`
  // GraphQL doesn't defend against duplicate fields in the query
  selections = [ ...new Set(selections) ]

  // bail out if they made no selections
  if (!selections.length) return ''

  let sql = 'SELECT\n  ' + selections.join(',\n  ') + '\n' + joins.join('\n')
  if (wheres.length) {
    sql += '\nWHERE ' + wheres.join(' AND ')
  }
  return sql
}

async function _stringifySqlAST(parent, node, prefix, context, selections, joins, wheres, batchScope) {
  switch(node.type) {
  case 'table':
    // generate the "where" condition, if applicable
    if (node.where) {
      const whereCondition = await node.where(`${quote(node.as)}`, node.args || {}, context, prefix) 
      if (whereCondition) {
        wheres.push(`${whereCondition}`)
      }
    }

    // generate the join or joins
    // this condition is for single joins (one-to-one or one-to-many relations)
    if (node.sqlJoin) {
      const joinCondition = await node.sqlJoin(`${quote(parent.as)}`, `${quote(node.as)}`, node.args || {}, context)

      joins.push(
        `LEFT JOIN ${node.name} AS ${quote(node.as)} ON ${joinCondition}`
      )
    // this condition is through a join table (many-to-many relations)
    } else if (node.joinTable) {
      if (!node.sqlJoins) throw new Error('Must set "sqlJoins" for a join table.')
      const joinCondition1 = await node.sqlJoins[0](`${quote(parent.as)}`, `${quote(node.joinTableAs)}`, node.args || {}, context)
      const joinCondition2 = await node.sqlJoins[1](`${quote(node.joinTableAs)}`, `${quote(node.as)}`, node.args || {}, context)

      joins.push(
        `LEFT JOIN ${node.joinTable} AS ${quote(node.joinTableAs)} ON ${joinCondition1}`,
        `LEFT JOIN ${node.name} AS ${quote(node.as)} ON ${joinCondition2}`
      )
    } else if (node.sqlBatch) {
      if (parent) {
        selections.push(
          `${quote(parent.as)}.${quote(node.sqlBatch.parentKey.name)} AS ${quote(joinPrefix(prefix) + node.sqlBatch.parentKey.as)}`
        )
      } else {
        joins.push(
          `FROM ${node.name} AS ${quote(node.as)}`
        )
        wheres.push(`${quote(node.as)}.${quote(node.sqlBatch.thisKey.name)} IN (${batchScope.map(maybeQuote).join(',')})`)
      }
    } else {
      // otherwise, this table is not being joined, its the first one and it goes in the "FROM" clause
      joins.push(
        `FROM ${node.name} AS ${quote(node.as)}`
      )
    }

    // recurse thru nodes
    if (!node.sqlBatch || !parent) {
      for (let child of node.children) {
        await _stringifySqlAST(node, child, [ ...prefix, node.as ], context, selections, joins, wheres)
      }
    }

    break
  case 'column':
    selections.push(
      `${quote(parent.as)}.${quote(node.name)} AS ${quote(joinPrefix(prefix) + node.as)}`
    )
    break
  case 'columnDeps':
    for (let name in node.names) {
      selections.push(
        `${quote(parent.as)}.${quote(name)} AS ${quote(joinPrefix(prefix) + node.names[name])}`
      )
    }
    break
  case 'composite':
    const keys = node.name.map(key => `${quote(parent.as)}.${quote(key)}`)
    // use the || operator for concatenation.
    // this is NOT supported in all SQL databases, e.g. some use a CONCAT function instead...
    selections.push(
      `CONCAT(${keys.join(', ')}) AS ${quote(joinPrefix(prefix) + node.fieldName)}`
    )
    break
  case 'expression':
    const expr = node.sqlExpr(`${quote(parent.as)}`, node.args || {}, context)
    selections.push(
      `${expr} AS ${quote(joinPrefix(prefix) + node.as)}`
    )
    break
  case 'noop':
    // this case if for fields that have nothing to do with the SQL, they resolve independantly
    return
  default:
    throw new Error('unexpected/unknown node type reached: ' + inspect(node))
  }
  return { selections, joins, wheres }
}

function quote(str) {
  return '`' + str + '`'
}

