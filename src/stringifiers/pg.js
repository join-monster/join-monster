import { validateSqlAST, inspect, cursorToObj, wrap } from '../util'
import { cursorToOffset } from 'graphql-relay'

export default function stringifySqlAST(topNode, context) {
  validateSqlAST(topNode)

  // recursively figure out all the selections, joins, and where conditions that we need
  let { selections, joins, wheres, orders } = _stringifySqlAST(null, topNode, '', context, [], [], [], [])
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

function _stringifySqlAST(parent, node, prefix, context, selections, joins, wheres, orders) {
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

      // do we need to paginate? if so this will be a lateral join
      if (node.paginate) {
        let whereCondition = node.sqlJoin(`"${parent.as}"`, node.name)

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
      const joinCondition1 = node.sqlJoins[0](`"${parent.as}"`, `"${node.joinTableAs}"`)
      const joinCondition2 = node.sqlJoins[1](`"${node.joinTableAs}"`, `"${node.as}"`)

      if (node.paginate) {

        if (node.sortKey) {
          let whereCondition = node.sqlJoins[0](`"${parent.as}"`, node.joinTable)
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
          const whereCondition = node.sqlJoins[0](`"${parent.as}"`, node.joinTable)
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
    } else if (node.paginate) {
      if (node.sortKey) {
        const { limit, orderColumns, whereCondition } = interpretForKeysetPaging(node)
        const join = `\
FROM (
  SELECT * FROM ${node.name}
  WHERE ${whereCondition || 'TRUE'}
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
        const join = `\
FROM (
  SELECT *, count(*) OVER () AS "$total"
  FROM ${node.name}
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
    for (let child of node.children) {
      _stringifySqlAST(node, child, parent ? prefix + node.as + '__' : prefix, context, selections, joins, wheres, orders)
    }

    break
  case 'column':
    let parentTable = node.fromOtherTable || parent.as
    selections.push(
      `"${parentTable}"."${node.name}" AS "${prefix + node.as}"`
    )
    break
  case 'columnDeps':
    // grab the dependant columns
    for (let name in node.names) {
      selections.push(
        `"${parent.as}"."${name}" AS "${prefix + node.names[name]}"`
      )
    }
    break
  case 'composite':
    const keys = node.name.map(key => `"${parent.as}"."${key}"`)
    // use the || operator for concatenation.
    // FIXME: this is NOT supported in all SQL databases, e.g. some use a CONCAT function instead...
    selections.push(
      `${keys.join(' || ')} AS "${prefix + node.fieldName}"`
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
      whereCondition = sortKeyToWhereCondition(cursorToObj(node.args.after), descending)
    }
    if (node.args.before) {
      throw new Error('Using "before" with "first" is nonsensical.')
    }
  } else if (node.args && node.args.last) {
    limit = parseInt(node.args.last) + 1
    if (node.args.before) {
      whereCondition = sortKeyToWhereCondition(cursorToObj(node.args.before), descending)
    }
    if (node.args.after) {
      throw new Error('Using "after" with "last" is nonsensical.')
    }
  }

  return { limit, orderColumns, whereCondition }
}

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

// wrap in a pair of single quotes for the SQL if needed
function maybeQuote(value) {
  return typeof value === 'number' ? value : `'${value}'`
}

function orderColumnsToString(orderColumns) {
  const conditions = []
  for (let column in orderColumns) {
    conditions.push(`${column} ${orderColumns[column]}`)
  }
  return conditions.join(', ')
}

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

