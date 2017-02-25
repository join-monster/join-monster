import assert from 'assert'
import { cursorToOffset } from 'graphql-relay'
import { validateSqlAST, inspect, cursorToObj, maybeQuote, wrap } from '../util'
import { filter } from 'lodash'
import {
  joinPrefix,
  quotePrefix,
  thisIsNotTheEndOfThisBatch,
  whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch
} from './shared'

export default async function stringifySqlAST(topNode, context, batchScope) {
  validateSqlAST(topNode)
  // recursively determine the selections, joins, and where conditions that we need
  let { selections, joins, wheres, orders } = await _stringifySqlAST(null, topNode, [], context, [], [], [], [], batchScope)

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

  if (orders.length) {
    sql += '\nORDER BY ' + stringifyOuterOrder(orders)
  }

  return sql
}

function stringifyOuterOrder(orders) {
  const conditions = []
  for (let condition of orders) {
    for (let column in condition.columns) {
      const direction = condition.columns[column]
      conditions.push(`${quote(condition.table)}.${quote(column)} ${direction}`)
    }
  }
  return conditions.join(', ')
}

async function _stringifySqlAST(parent, node, prefix, context, selections, joins, wheres, orders, batchScope) {
  switch(node.type) {
  case 'table':
    await handleTable(parent, node, prefix, context, selections, joins, wheres, orders, batchScope)

    // recurse thru nodes
    if (thisIsNotTheEndOfThisBatch(node, parent)) {
      for (let child of node.children) {
        await _stringifySqlAST(node, child, [ ...prefix, node.as ], context, selections, joins, wheres, orders)
      }
    }

    break
  case 'column':
    selections.push(
      `${quote(node.fromOtherTable || parent.as)}.${quote(node.name)} AS ${quote(joinPrefix(prefix) + node.as)}`
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
    const parentTable = node.fromOtherTable || parent.as
    const keys = node.name.map(key => `${quote(parentTable)}.${quote(key)}`)
    // use the || operator for concatenation.
    // this is NOT supported in all SQL databases, e.g. some use a CONCAT function instead...
    selections.push(
      `CONCAT(${keys.join(', ')}) AS ${quote(joinPrefix(prefix) + node.fieldName)}`
    )
    break
  case 'expression':
    const expr = await node.sqlExpr(`${quote(parent.as)}`, node.args || {}, context, quotePrefix(prefix, '`'))
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
  return { selections, joins, wheres, orders }
}

async function handleTable(parent, node, prefix, context, selections, joins, wheres, orders, batchScope) {
  // generate the "where" condition, if applicable
  if (node.where && whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch(node, parent)) {
    const whereCondition = await node.where(`${quote(node.as)}`, node.args || {}, context, quotePrefix(prefix, '`')) 
    if (whereCondition) {
      wheres.push(`${whereCondition}`)
    }
  }

  // this branch is for one-to-many using JOIN
  if (node.sqlJoin) {
    const joinCondition = await node.sqlJoin(`${quote(parent.as)}`, `${quote(node.as)}`, node.args || {}, context)

    joins.push(
      `LEFT JOIN ${node.name} AS ${quote(node.as)} ON ${joinCondition}`
    )

  // this is for many-to-many with batching
  } else if (node.junctionTable && node.junctionBatch) {
    if (parent) {
      selections.push(
        `${quote(parent.as)}.${quote(node.junctionBatch.parentKey.name)} AS ${quote(joinPrefix(prefix) + node.junctionBatch.parentKey.as)}`
      )
    } else {
      const joinCondition = await node.junctionBatch.sqlJoin(`${quote(node.junctionTableAs)}`, `${quote(node.as)}`, node.args || {}, context)
      if (node.paginate) {
        await handleBatchedManyToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, batchScope, joinCondition)
      } else {
        joins.push(
          `FROM ${node.junctionTable} AS ${quote(node.junctionTableAs)}`,
          `LEFT JOIN ${node.name} AS ${quote(node.as)} ON ${joinCondition}`
        )
        wheres.push(`${quote(node.junctionTableAs)}.${quote(node.junctionBatch.thisKey.name)} IN (${batchScope.join(',')})`)
      }
    }

  // many-to-many using JOINs
  } else if (node.junctionTable) {
    assert(node.sqlJoins, 'Must set "sqlJoins" for a join table.')
    const joinCondition1 = await node.sqlJoins[0](`${quote(parent.as)}`, `${quote(node.junctionTableAs)}`, node.args || {}, context)
    const joinCondition2 = await node.sqlJoins[1](`${quote(node.junctionTableAs)}`, `${quote(node.as)}`, node.args || {}, context)

    joins.push(
      `LEFT JOIN ${node.junctionTable} AS ${quote(node.junctionTableAs)} ON ${joinCondition1}`,
      `LEFT JOIN ${node.name} AS ${quote(node.as)} ON ${joinCondition2}`
    )

  // one-to-many using batching
  } else if (node.sqlBatch) {
    if (parent) {
      selections.push(
        `${quote(parent.as)}.${quote(node.sqlBatch.parentKey.name)} AS ${quote(joinPrefix(prefix) + node.sqlBatch.parentKey.as)}`
      )
    } else {
      if (node.paginate) {
        await handleBatchedOneToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, batchScope)
      } else {
        joins.push(
          `FROM ${node.name} AS ${quote(node.as)}`
        )
        wheres.push(`${quote(node.as)}.${quote(node.sqlBatch.thisKey.name)} IN (${batchScope.map(maybeQuote).join(',')})`)
      }
    }

  // otherwise, this table is not being joined, its the first one and it goes in the "FROM" clause
  } else if (node.paginate) {
    await handlePaginationAtRoot(parent, node, prefix, context, selections, joins, wheres, orders)
  } else {
    assert(!parent, `Object type for "${node.fieldName}" table must have a "sqlJoin" or "sqlBatch"`)
    joins.push(
      `FROM ${node.name} AS ${quote(node.as)}`
    )
  }
}

async function handlePaginationAtRoot(parent, node, prefix, context, selections, joins, wheres, orders) {
  const pagingWhereConditions = []
  if (node.sortKey) {
    var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node) // eslint-disable-line no-redeclare
    pagingWhereConditions.push(whereAddendum)
    if (node.where) {
      pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
    }
    joins.push(keysetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, node.as))
  } else if (node.orderBy) {
    var { limit, offset, orderColumns } = interpretForOffsetPaging(node) // eslint-disable-line no-redeclare
    if (node.where) {
      pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
    }
    joins.push(offsetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, offset, node.as))
  }
  orders.push({
    table: node.as,
    columns: orderColumns
  })
}

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
// take the sort key and translate that for the where clause
function sortKeyToWhereCondition(keyObj, descending) {
  const sortColumns = []
  const sortValues = []
  for (let key in keyObj) {
    sortColumns.push(quote(key))
    sortValues.push(maybeQuote(keyObj[key]))
  }
  const operator = descending ? '<' : '>'
  return `(${sortColumns.join(', ')}) ${operator} (${sortValues.join(', ')})`
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

  let limit = '18446744073709551615', whereCondition = ''
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
  let limit = '18446744073709551615', offset = 0
  if (node.args && node.args.first) {
    // we'll get one extra item (hence the +1). this is to determine if there is a next page or not
    limit = parseInt(node.args.first) + 1
    if (node.args.after) {
      offset = cursorToOffset(node.args.after) + 1
    }
  }
  return { limit, offset, orderColumns }
}
function orderColumnsToString(orderColumns) {
  const conditions = []
  for (let column in orderColumns) {
    conditions.push(`${quote(column)} ${orderColumns[column]}`)
  }
  return conditions.join(', ')
}
function offsetPagingSelect(table, pagingWhereConditions, orderColumns, limit, offset, as, joinCondition, joinType = '') {
  const whereCondition = filter(pagingWhereConditions).join(' AND ') || 'TRUE'
  if (joinCondition) {
    return `\
${joinType} JOIN LATERAL (
  SELECT *, count(*) OVER () AS \`$total\`
  FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit} OFFSET ${offset}
) AS "${as}" ON ${joinCondition}`
  } else {
    return `\
FROM (
  SELECT *, count(*) OVER () AS \`$total\`
  FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit} OFFSET ${offset}
) AS ${quote(as)}`
  }
}
function keysetPagingSelect(table, whereCondition, orderColumns, limit, as, joinCondition, joinType = '') {
  whereCondition = filter(whereCondition).join(' AND ') || 'TRUE'
  if (joinCondition) {
    return `\
${joinType} JOIN LATERAL (
  SELECT * FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit}
) AS "${as}" ON ${joinCondition}`
  } else {
    return `\
FROM (
  SELECT * FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit}
) AS ${quote(as)}`
  }
}

function paginatedSelect(table, whereConditions, orderColumns, limit, offset, withTotal = false) {
  return `\
  (SELECT *${withTotal ? ', count(*) OVER () AS `$total`': '' }
  FROM ${table}
  WHERE ${whereConditions}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit}${offset ? ' OFFSET ' + offset : ''})`
}

function joinUnions(unions, as) {
  return `FROM (
${unions.join('\nUNION\n')}
) AS ${quote(as)}`
}

async function handleBatchedOneToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, batchScope) {
  const pagingWhereConditions = []
  if (node.where) {
    pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
  }
  if (node.sortKey) {
    var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node) // eslint-disable-line no-redeclare
    pagingWhereConditions.push(whereAddendum)
    const unions = batchScope.map(val => {
      let whereConditions = [ ...pagingWhereConditions, `${node.name}.${quote(node.sqlBatch.thisKey.name)} = ${val}` ]
      whereConditions = filter(whereConditions).join(' AND ') || '1'
      return paginatedSelect(node.name, whereConditions, orderColumns, limit, offset, true)
    })
    joins.push(joinUnions(unions, node.as))
  } else if (node.orderBy) {
    var { limit, offset, orderColumns } = interpretForOffsetPaging(node) // eslint-disable-line no-redeclare
    const unions = batchScope.map(val => {
      let whereConditions = [ ...pagingWhereConditions, `${node.name}.${quote(node.sqlBatch.thisKey.name)} = ${val}` ]
      whereConditions = filter(whereConditions).join(' AND ') || '1'
      return paginatedSelect(node.name, whereConditions, orderColumns, limit, offset, true)
    })
    joins.push(joinUnions(unions, node.as))
  }
  orders.push({
    table: node.as,
    columns: orderColumns
  })
}

async function handleBatchedManyToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, batchScope, joinCondition) {
  const pagingWhereConditions = []
  if (node.where) {
    pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
  }
  if (node.sortKey) {
    var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node) // eslint-disable-line no-redeclare
    pagingWhereConditions.push(whereAddendum)
    const unions = batchScope.map(val => {
      let whereConditions = [ ...pagingWhereConditions, `${node.junctionTable}.${quote(node.junctionBatch.thisKey.name)} = ${val}` ]
      whereConditions = filter(whereConditions).join(' AND ') || '1'
      return paginatedSelect(node.junctionTable, whereConditions, orderColumns, limit, offset, true)
    })
    joins.push(joinUnions(unions, node.junctionTableAs))
  } else if (node.orderBy) {
    var { limit, offset, orderColumns } = interpretForOffsetPaging(node) // eslint-disable-line no-redeclare
    const unions = batchScope.map(val => {
      let whereConditions = [ ...pagingWhereConditions, `${node.junctionTable}.${quote(node.junctionBatch.thisKey.name)} = ${val}` ]
      whereConditions = filter(whereConditions).join(' AND ') || '1'
      return paginatedSelect(node.junctionTable, whereConditions, orderColumns, limit, offset, true)
    })
    joins.push(joinUnions(unions, node.junctionTableAs))
  }
  joins.push(`LEFT JOIN ${node.name} AS ${quote(node.as)} ON ${joinCondition}`)
  orders.push({
    table: node.junctionTableAs,
    columns: orderColumns
  })
}

function quote(str) {
  return '`' + str + '`'
}

