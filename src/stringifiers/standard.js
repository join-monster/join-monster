import { validateSqlAST, inspect } from '../util'

export default function stringifySqlAST(topNode, context) {
  validateSqlAST(topNode)
  // recursively determine the selections, joins, and where conditions that we need
  let { selections, joins, wheres } = _stringifySqlAST(null, topNode, '', context, [], [], [])

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

function _stringifySqlAST(parent, node, prefix, context, selections, joins, wheres) {
  switch(node.type) {
  case 'table':
    // generate the "where" condition, if applicable
    if (node.where) {
      const whereCondition = node.where(`"${node.as}"`, node.args || {}, context) 
      if (whereCondition) {
        wheres.push(`${whereCondition}`)
      }
    }

    // generate the join or joins
    // this condition is for single joins (one-to-one or one-to-many relations)
    if (node.sqlJoin) {
      const joinCondition = node.sqlJoin(`"${parent.as}"`, `"${node.as}"`)

      joins.push(
        `LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition}`
      )
    // this condition is through a join table (many-to-many relations)
    } else if (node.joinTable) {
      if (!node.sqlJoins) throw new Error('Must set "sqlJoins" for a join table.')
      const joinCondition1 = node.sqlJoins[0](`"${parent.as}"`, `"${node.joinTableAs}"`)
      const joinCondition2 = node.sqlJoins[1](`"${node.joinTableAs}"`, `"${node.as}"`)

      joins.push(
        `LEFT JOIN ${node.joinTable} AS "${node.joinTableAs}" ON ${joinCondition1}`,
        `LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition2}`
      )
    } else {
      // otherwise, this table is not being joined, its the first one and it goes in the "FROM" clause
      joins.push(
        `FROM ${node.name} AS "${node.as}"`
      )
    }

    // recurse thru nodes
    for (let child of node.children) {
      _stringifySqlAST(node, child, parent ? prefix + node.as + '__' : prefix, context, selections, joins, wheres)
    }

    break
  case 'column':
    selections.push(
      `"${parent.as}"."${node.name}" AS "${prefix + node.as}"`
    )
    break
  case 'columnDeps':
    for (let name in node.names) {
      selections.push(
        `"${parent.as}"."${name}" AS "${prefix + node.names[name]}"`
      )
    }
    break
  case 'composite':
    const keys = node.name.map(key => `"${parent.as}"."${key}"`)
    // use the || operator for concatenation.
    // this is NOT supported in all SQL databases, e.g. some use a CONCAT function instead...
    selections.push(
      `${keys.join(' || ')} AS "${prefix + node.fieldName}"`
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

