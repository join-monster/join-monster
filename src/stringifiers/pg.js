import { validateSqlAST, inspect } from '../util'
import { cursorToOffset } from 'graphql-relay'

export default function stringifySqlAST(topNode, context) {
  validateSqlAST(topNode)
  let { selections, joins, wheres } = _stringifySqlAST(null, topNode, '', context, [], [], [])
  // make sure these are unique by converting to a set and then back to an array
  selections = [ ...new Set(selections) ]
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
    if (node.sqlJoin && node.paginate) {
      if (node.args && node.args.last) {
        throw new Error('Backward pagination not supported with offsets. Consider using keyset pagination instead')
      }
      let orderCondition
      if (typeof node.orderBy === 'object') {
        const orderColumns = []
        for (let column in node.orderBy) {
          let direction = node.orderBy[column].toUpperCase()
          if (direction !== 'ASC' && direction !== 'DESC') {
            throw new Error (direction + ' is not a valid sorting direction')
          }
          orderColumns.push(`"${column}" ${direction}`)
        }
        orderCondition = orderColumns.join(', ')
      } else if (typeof node.orderBy === 'string') {
        orderCondition = `"${node.orderBy}"`
      } else {
        throw new Error('"orderBy" is required for pagination')
      }
      const joinCondition = node.sqlJoin(`"${parent.as}"`, `"${node.as}"`)
      const whereCondition = node.sqlJoin(`"${parent.as}"`, node.name)
      let limit = 'ALL', offset = 0
      if (node.args && node.args.first) {
        limit = parseInt(node.args.first) + 1
        if (node.args.after) {
          offset = cursorToOffset(node.args.after) + 1
        }
      }
      const join = `\
LEFT JOIN LATERAL (
  SELECT *, count(*) OVER () AS "$total"
  FROM ${node.name}
  WHERE ${whereCondition}
  ORDER BY ${orderCondition}
  LIMIT ${limit} OFFSET ${offset}
) AS "${node.as}" ON ${joinCondition}`
      joins.push(join)
    } else if (node.sqlJoin) {
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
    } else if (node.paginate) {
      if (node.args && node.args.last) {
        throw new Error('Backward pagination not supported with offsets. Consider using keyset pagination instead')
      }
      let orderCondition
      if (typeof node.orderBy === 'object') {
        const orderColumns = []
        for (let column in node.orderBy) {
          let direction = node.orderBy[column].toUpperCase()
          if (direction !== 'ASC' && direction !== 'DESC') {
            throw new Error (direction + ' is not a valid sorting direction')
          }
          orderColumns.push(`"${column}" ${direction}`)
        }
        orderCondition = orderColumns.join(', ')
      } else if (typeof node.orderBy === 'string') {
        orderCondition = `"${node.orderBy}"`
      } else {
        throw new Error('"orderBy" is required for pagination')
      }
      let limit = 'ALL', offset = 0
      if (node.args && node.args.first) {
        limit = parseInt(node.args.first) + 1
        if (node.args.after) {
          offset = cursorToOffset(node.args.after) + 1
        }
      }
      const join = `\
FROM (
  SELECT *, count(*) OVER () AS "$total"
  FROM ${node.name}
  ORDER BY ${orderCondition}
  LIMIT ${limit} OFFSET ${offset}
) AS "${node.as}"`
      joins.push(join)
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
    return
  default:
    throw new Error('unexpected/unknown node type reached: ' + inspect(node))
  }
  return { selections, joins, wheres }
}

