import { cursorToOffset } from 'graphql-relay'
import { validateSqlAST, inspect, cursorToObj, wrap, maybeQuote } from '../util'
import { joinPrefix } from './shared'

export default async function stringifySqlAST(topNode, context, batchScope) {
  validateSqlAST(topNode)

  // recursively figure out all the selections, joins, and where conditions that we need
  let { selections, joins, wheres, orders } = await _stringifySqlAST(null, topNode, [], context, [], [], [], [], batchScope)

  // make sure these are unique by converting to a set and then back to an array
  // e.g. we want to get rid of things like `SELECT user.id as id, user.id as id, ...`
  // GraphQL does not prevent queries with duplicate fields
  selections = [ ...new Set(selections) ]

  // bail out if they made no selections 
  if (!selections.length) return ''

  // put together the SQL query
  let sql = 'SELECT\n  ' + selections.join(',\n  ') + '\n' + joins.join('\n')
  if (wheres.length) {
    sql += '\nWHERE ' + wheres.join(' AND ')
  }
  if (orders.length) {
    sql += '\nORDER BY ' + stringifyOuterOrder(orders)
  }
  return sql
}

async function _stringifySqlAST(parent, node, prefix, context, selections, joins, wheres, orders, batchScope) {
  switch(node.type) {
  case 'table':
    // generate the "where" condition, if applicable
    if (node.where && !node.paginate) {
      const whereCondition = await node.where(`"${node.as}"`, node.args || {}, context, prefix)
      if (whereCondition) {
        wheres.push(`${whereCondition}`)
      }
    }

    // generate the join or joins
    // this condition is for single joins (one-to-one or one-to-many relations)
    if (node.sqlJoin) {
      const joinCondition = await node.sqlJoin(`"${parent.as}"`, `"${node.as}"`, node.args || {}, context)

      // do we need to paginate? if so this will be a lateral join
      if (node.paginate) {
        let whereCondition = await node.sqlJoin(`"${parent.as}"`, node.name, node.args || {}, context)
        if (node.where) {
          const filterCondition = await node.where(`${node.name}`, node.args || {}, context, prefix) 
          if (filterCondition) {
            whereCondition += ' AND ' + filterCondition
          }
        }

        if (node.sortKey) {

          const { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node)
          if (whereAddendum) {
            whereCondition += ' AND ' + whereAddendum
          }
          const join = `\
LEFT JOIN LATERAL (
  SELECT * FROM ${node.name}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit}
) AS "${node.as}" ON ${joinCondition}`
          joins.push(join)
          orders.push({
            table: node.as,
            columns: orderColumns
          })

        } else if (node.orderBy) {

          const { limit, offset, orderColumns } = interpretForOffsetPaging(node)
          const join = `\
LEFT JOIN LATERAL (
  SELECT *, count(*) OVER () AS "$total"
  FROM ${node.name}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit} OFFSET ${offset}
) AS "${node.as}" ON ${joinCondition}`
          joins.push(join)
          orders.push({
            table: node.as,
            columns: orderColumns
          })
        }

      // otherwite, just a regular left join on the table
      } else {
        joins.push(
          `LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition}`
        )
      }
    
    // this branch is for many-to-many relations, needs two joins
    } else if (node.joinTable) {
      if (!node.sqlJoins) throw new Error('Must set "sqlJoins" for a join table.')
      const joinCondition1 = await node.sqlJoins[0](`"${parent.as}"`, `"${node.joinTableAs}"`, node.args || {}, context)
      const joinCondition2 = await node.sqlJoins[1](`"${node.joinTableAs}"`, `"${node.as}"`, node.args || {}, context)

      if (node.paginate) {
        let whereCondition = await node.sqlJoins[0](`"${parent.as}"`, node.joinTable, node.args || {}, context)
        if (node.where) {
          const filterCondition = await node.where(`${node.name}`, node.args || {}, context, prefix) 
          if (filterCondition) {
            whereCondition += ' AND ' + filterCondition
          }
        }

        if (node.sortKey) {
          const { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node)
          if (whereAddendum) {
            whereCondition += ' AND ' + whereAddendum
          }
          const join = `\
LEFT JOIN LATERAL (
  SELECT * FROM ${node.joinTable}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit}
) AS "${node.joinTableAs}" ON ${joinCondition1}`
          joins.push(join)
          orders.push({
            table: node.joinTableAs,
            columns: orderColumns
          })

        } else if (node.orderBy) {

          const { limit, offset, orderColumns } = interpretForOffsetPaging(node)
          const join = `\
LEFT JOIN LATERAL (
  SELECT *, count(*) OVER () AS "$total"
  FROM ${node.joinTable}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit} OFFSET ${offset}
) AS "${node.joinTableAs}" ON ${joinCondition1}`
          joins.push(join)
          orders.push({
            table: node.joinTableAs,
            columns: orderColumns
          })
        }

      } else {
        joins.push(
          `LEFT JOIN ${node.joinTable} AS "${node.joinTableAs}" ON ${joinCondition1}`
        )
      }
      joins.push(
        `LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition2}`
      )

    // otherwise, we aren't joining, so we are at the "root", and this is the start of the FROM clause
    } else if (node.sqlBatch) {
      if (parent) {
        selections.push(
          `"${parent.as}"."${node.sqlBatch.parentKey.name}" AS "${joinPrefix(prefix) + node.sqlBatch.parentKey.as}"`
        )
      } else {
        if (node.paginate) {
          if (node.sortKey) {
            let { limit, orderColumns, whereCondition } = interpretForKeysetPaging(node)
            whereCondition = whereCondition || 'TRUE'
            whereCondition += ' AND ' + `"${node.name}"."${node.sqlBatch.thisKey.name}" = temp."${node.sqlBatch.parentKey.name}"`
            if (node.where) {
              const filterCondition = await node.where(`${node.name}`, node.args || {}, context, prefix) 
              if (filterCondition) {
                whereCondition += ' AND ' + filterCondition
              }
            }
            const join = `\
FROM (VALUES ${batchScope.map(val => `(${val})`)}) temp("${node.sqlBatch.parentKey.name}")
JOIN LATERAL (
  SELECT * FROM ${node.name}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit}
) AS "${node.as}" ON "${node.as}"."${node.sqlBatch.thisKey.name}" = temp."${node.sqlBatch.parentKey.name}"`
            joins.push(join)
            orders.push({
              table: node.as,
              columns: orderColumns
            })
          } else if (node.orderBy) {
            const { limit, offset, orderColumns } = interpretForOffsetPaging(node)
            let whereCondition = 'TRUE'
            if (node.where) {
              const filterCondition = await node.where(`${node.name}`, node.args || {}, context, prefix) 
              if (filterCondition) {
                whereCondition = filterCondition
              }
            }
            whereCondition += ' AND ' + `"${node.as}"."${node.sqlBatch.thisKey.name}" IN (${batchScope.join(',')})`
            const join = `\
FROM (
  SELECT *, count(*) OVER () AS "$total"
  FROM ${node.name}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit} OFFSET ${offset}
) AS "${node.as}"`
            joins.push(join)
            orders.push({
              table: node.as,
              columns: orderColumns
            })
          }
        } else {
          joins.push(
            `FROM ${node.name} AS "${node.as}"`
          )
          wheres.push(`"${node.as}"."${node.sqlBatch.thisKey.name}" IN (${batchScope.join(',')})`)
        }
      }
    } else if (node.paginate) {
      if (node.sortKey) {
        let { limit, orderColumns, whereCondition } = interpretForKeysetPaging(node)
        whereCondition = whereCondition || 'TRUE'
        if (node.where) {
          const filterCondition = await node.where(`${node.name}`, node.args || {}, context, prefix) 
          if (filterCondition) {
            whereCondition += ' AND ' + filterCondition
          }
        }
        const join = `\
FROM (
  SELECT * FROM ${node.name}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit}
) AS "${node.as}"`
        joins.push(join)
        orders.push({
          table: node.as,
          columns: orderColumns
        })
      } else if (node.orderBy) {
        const { limit, offset, orderColumns } = interpretForOffsetPaging(node)
        let whereCondition = 'TRUE'
        if (node.where) {
          const filterCondition = await node.where(`${node.name}`, node.args || {}, context, prefix) 
          if (filterCondition) {
            whereCondition = filterCondition
          }
        }
        const join = `\
FROM (
  SELECT *, count(*) OVER () AS "$total"
  FROM ${node.name}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit} OFFSET ${offset}
) AS "${node.as}"`
        joins.push(join)
        orders.push({
          table: node.as,
          columns: orderColumns
        })
      }
    } else {
      // otherwise, this table is not being joined, its the first one and it goes in the "FROM" clause
      joins.push(
        `FROM ${node.name} AS "${node.as}"`
      )
    }

    // recurse thru nodes
    if (!node.sqlBatch || !parent) {
      for (let child of node.children) {
        await _stringifySqlAST(node, child, [ ...prefix, node.as ], context, selections, joins, wheres, orders)
      }
    }

    break
  case 'column':
    let parentTable = node.fromOtherTable || parent.as
    selections.push(
      `"${parentTable}"."${node.name}" AS "${joinPrefix(prefix) + node.as}"`
    )
    break
  case 'columnDeps':
    // grab the dependant columns
    for (let name in node.names) {
      selections.push(
        `"${parent.as}"."${name}" AS "${joinPrefix(prefix) + node.names[name]}"`
      )
    }
    break
  case 'composite':
    const keys = node.name.map(key => `"${parent.as}"."${key}"`)
    selections.push(
      `NULLIF(CONCAT(${keys.join(', ')}), '') AS "${joinPrefix(prefix) + node.fieldName}"`
    )
    break
  case 'expression':
    const expr = node.sqlExpr(`"${parent.as}"`, node.args || {}, context)
    selections.push(
      `${expr} AS "${joinPrefix(prefix) + node.as}"`
    )
    break
  case 'noop':
    // we hit this with fields that don't need anything from SQL, they resolve independantly
    return
  default:
    throw new Error('unexpected/unknown node type reached: ' + inspect(node))
  }
  return { selections, joins, wheres, orders }
}

// find out what the limit, offset, order by parts should be from the relay connection args if we're paginating
function interpretForOffsetPaging(node) {
  if (node.args && node.args.last) {
    throw new Error('Backward pagination not supported with offsets. Consider using keyset pagination instead')
  }
  const orderColumns = {}
  if (typeof node.orderBy === 'object') {
    for (let column in node.orderBy) {
      let direction = node.orderBy[column].toUpperCase()
      if (direction !== 'ASC' && direction !== 'DESC') {
        throw new Error (direction + ' is not a valid sorting direction')
      }
      orderColumns[column] = direction
    }
  } else if (typeof node.orderBy === 'string') {
    orderColumns[node.orderBy] = 'ASC'
  } else {
    throw new Error('"orderBy" is required for pagination')
  }
  let limit = 'ALL', offset = 0
  if (node.args && node.args.first) {
    // we'll get one extra item (hence the +1). this is to determine if there is a next page or not
    limit = parseInt(node.args.first) + 1
    if (node.args.after) {
      offset = cursorToOffset(node.args.after) + 1
    }
  }
  return { limit, offset, orderColumns }
}

function interpretForKeysetPaging(node) {
  const orderColumns = {}
  let descending = node.sortKey.order.toUpperCase() === 'DESC'
  // flip the sort order if doing backwards paging
  if (node.args && node.args.last) {
    descending = !descending
  }
  for (let column of wrap(node.sortKey.key)) {
    orderColumns[column] = descending ? 'DESC' : 'ASC'
  }

  let limit = 'ALL', whereCondition = ''
  if (node.args && node.args.first) {
    limit = parseInt(node.args.first) + 1
    if (node.args.after) {
      const cursorObj = cursorToObj(node.args.after)
      validateCursor(cursorObj, wrap(node.sortKey.key))
      whereCondition = sortKeyToWhereCondition(cursorObj, descending)
    }
    if (node.args.before) {
      throw new Error('Using "before" with "first" is nonsensical.')
    }
  } else if (node.args && node.args.last) {
    limit = parseInt(node.args.last) + 1
    if (node.args.before) {
      const cursorObj = cursorToObj(node.args.before)
      validateCursor(cursorObj, wrap(node.sortKey.key))
      whereCondition = sortKeyToWhereCondition(cursorObj, descending)
    }
    if (node.args.after) {
      throw new Error('Using "after" with "last" is nonsensical.')
    }
  }

  return { limit, orderColumns, whereCondition }
}

// take the sort key and translate that for the where clause
function sortKeyToWhereCondition(keyObj, descending) {
  const sortColumns = []
  const sortValues = []
  for (let key in keyObj) {
    sortColumns.push(`"${key}"`)
    sortValues.push(maybeQuote(keyObj[key]))
  }
  const operator = descending ? '<' : '>'
  return `(${sortColumns.join(', ')}) ${operator} (${sortValues.join(', ')})`
}


function orderColumnsToString(orderColumns) {
  const conditions = []
  for (let column in orderColumns) {
    conditions.push(`"${column}" ${orderColumns[column]}`)
  }
  return conditions.join(', ')
}

// we need one ORDER BY clause on at the very end to make sure everything comes back in the correct order
// ordering inner(sub) queries DOES NOT guarantee the order of those results in the outer query
function stringifyOuterOrder(orders) {
  const conditions = []
  for (let condition of orders) {
    for (let column in condition.columns) {
      const direction = condition.columns[column]
      conditions.push(`"${condition.table}"."${column}" ${direction}`)
    }
  }
  return conditions.join(', ')
}

// the cursor contains the sort keys. it needs to match the keys specified in the `sortKey` on this field in the schema
function validateCursor(cursorObj, expectedKeys) {
  const actualKeys = Object.keys(cursorObj)
  const expectedKeySet = new Set(expectedKeys)
  const actualKeySet = new Set(actualKeys)
  for (let key of actualKeys) {
    if (!expectedKeySet.has(key)) {
      throw new Error(`Invalid cursor. The column "${key}" is not in the sort key.`)
    }
  }
  for (let key of expectedKeys) {
    if (!actualKeySet.has(key)) {
      throw new Error(`Invalid cursor. The column "${key}" is not in the cursor.`)
    }
  }
}

