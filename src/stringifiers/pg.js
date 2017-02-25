import assert from 'assert'
import { cursorToOffset } from 'graphql-relay'
import { filter } from 'lodash'
import { validateSqlAST, inspect, cursorToObj, wrap, maybeQuote } from '../util'
import {
  joinPrefix,
  quotePrefix,
  thisIsNotTheEndOfThisBatch,
  whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch
} from './shared'

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

  wheres = filter(wheres)
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
      `"${node.fromOtherTable || parent.as}"."${node.name}" AS "${joinPrefix(prefix) + node.as}"`
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
    const parentTable = node.fromOtherTable || parent.as
    const keys = node.name.map(key => `"${parentTable}"."${key}"`)
    selections.push(
      `NULLIF(CONCAT(${keys.join(', ')}), '') AS "${joinPrefix(prefix) + node.fieldName}"`
    )
    break
  case 'expression':
    const expr = await node.sqlExpr(`"${parent.as}"`, node.args || {}, context, quotePrefix(prefix))
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

async function handleTable(parent, node, prefix, context, selections, joins, wheres, orders, batchScope) {
  // generate the "where" condition, if applicable
  if (node.where && whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch(node, parent)) {
    wheres.push(await node.where(`"${node.as}"`, node.args || {}, context, quotePrefix(prefix)))
  }

  // one-to-many using JOIN
  if (node.sqlJoin) {
    const joinCondition = await node.sqlJoin(`"${parent.as}"`, `"${node.as}"`, node.args || {}, context)

    // do we need to paginate? if so this will be a lateral join
    if (node.paginate) {
      await handleJoinedOneToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, joinCondition)

    // otherwite, just a regular left join on the table
    } else {
      joins.push(
        `LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition}`
      )
    }
  
  // many-to-many using batching
  } else if (node.junctionTable && node.junctionBatch) {
    if (parent) {
      selections.push(
        `"${parent.as}"."${node.junctionBatch.parentKey.name}" AS "${joinPrefix(prefix) + node.junctionBatch.parentKey.as}"`
      )
    } else {
      const joinCondition = await node.junctionBatch.sqlJoin(`"${node.junctionTableAs}"`, node.as, node.args || {}, context)
      if (node.paginate) {
        await handleBatchedManyToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, batchScope, joinCondition)

      } else {
        joins.push(
          `FROM ${node.junctionTable} AS "${node.junctionTableAs}"`,
          `LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition}`
        )
        // ensures only the correct records are fetched using the value of the parent key
        wheres.push(`"${node.junctionTableAs}"."${node.junctionBatch.thisKey.name}" IN (${batchScope.join(',')})`)
      }
    }

  // many-to-many using JOINs
  } else if (node.junctionTable) {
    assert(node.sqlJoins, 'Must set "sqlJoins" for a join table.')
    const joinCondition1 = await node.sqlJoins[0](`"${parent.as}"`, `"${node.junctionTableAs}"`, node.args || {}, context)
    const joinCondition2 = await node.sqlJoins[1](`"${node.junctionTableAs}"`, `"${node.as}"`, node.args || {}, context)

    if (node.paginate) {
      await handleJoinedManyToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, joinCondition1)

    } else {
      joins.push(
        `LEFT JOIN ${node.junctionTable} AS "${node.junctionTableAs}" ON ${joinCondition1}`
      )
    }
    joins.push(
      `LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition2}`
    )

  // one-to-many with batching
  } else if (node.sqlBatch) {
    if (parent) {
      selections.push(
        `"${parent.as}"."${node.sqlBatch.parentKey.name}" AS "${joinPrefix(prefix) + node.sqlBatch.parentKey.as}"`
      )
    } else {
      if (node.paginate) {
        await handleBatchedOneToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, batchScope)

      } else {
        joins.push(
          `FROM ${node.name} AS "${node.as}"`
        )
        wheres.push(`"${node.as}"."${node.sqlBatch.thisKey.name}" IN (${batchScope.join(',')})`)
      }
    }
  // otherwise, we aren't joining, so we are at the "root", and this is the start of the FROM clause
  } else if (node.paginate) {
    await handlePaginationAtRoot(parent, node, prefix, context, selections, joins, wheres, orders)
  } else {
    assert(!parent, `Object type for "${node.fieldName}" table must have a "sqlJoin" or "sqlBatch"`)
    joins.push(
      `FROM ${node.name} AS "${node.as}"`
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
  } else {
    throw new Error('"sortKey" or "orderBy" is required if "sqlPaginate" is true')
  }

  orders.push({
    table: node.as,
    columns: orderColumns
  })

}

async function handleJoinedOneToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, joinCondition) {
  const pagingWhereConditions = [
    await node.sqlJoin(`"${parent.as}"`, node.name, node.args || {}, context),
  ]
  if (node.where) {
    pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
  }

  // which type of pagination are they using?
  if (node.sortKey) {
    var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node)
    pagingWhereConditions.push(whereAddendum)
    joins.push(keysetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, node.as, joinCondition, 'LEFT'))
  } else if (node.orderBy) {
    var { limit, offset, orderColumns } = interpretForOffsetPaging(node) // eslint-disable-line no-redeclare
    joins.push(offsetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, offset, node.as, joinCondition, 'LEFT'))
  } else {
    throw new Error('"sortKey" or "orderBy" is required if "sqlPaginate" is true')
  }

  orders.push({
    table: node.as,
    columns: orderColumns
  })
}

async function handleBatchedOneToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, batchScope) {
  const pagingWhereConditions = [
    `"${node.name}"."${node.sqlBatch.thisKey.name}" = temp."${node.sqlBatch.parentKey.name}"`
  ]
  if (node.where) {
    pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, []))
  }
  const tempTable = `FROM (VALUES ${batchScope.map(val => `(${val})`)}) temp("${node.sqlBatch.parentKey.name}")`
  joins.push(tempTable)
  const lateralJoinCondition = `"${node.as}"."${node.sqlBatch.thisKey.name}" = temp."${node.sqlBatch.parentKey.name}"`
  if (node.sortKey) {
    var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node) // eslint-disable-line no-redeclare
    pagingWhereConditions.push(whereAddendum)
    joins.push(keysetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, node.as, lateralJoinCondition))
  } else if (node.orderBy) {
    var { limit, offset, orderColumns } = interpretForOffsetPaging(node) // eslint-disable-line no-redeclare
    joins.push(offsetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, offset, node.as, lateralJoinCondition))
  } else {
    throw new Error('"sortKey" or "orderBy" is required if "sqlPaginate" is true')
  }

  orders.push({
    table: node.as,
    columns: orderColumns
  })
}

async function handleBatchedManyToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, batchScope, joinCondition) {
  const pagingWhereConditions = [
    `${node.junctionTable}."${node.junctionBatch.thisKey.name}" = temp."${node.junctionBatch.parentKey.name}"`
  ]
  if (node.where) {
    pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
  }

  const tempTable = `FROM (VALUES ${batchScope.map(val => `(${val})`)}) temp("${node.junctionBatch.parentKey.name}")`
  joins.push(tempTable)
  const lateralJoinCondition = `"${node.junctionTableAs}"."${node.junctionBatch.thisKey.name}" = temp."${node.junctionBatch.parentKey.name}"`

  if (node.sortKey) {
    var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node) // eslint-disable-line no-redeclare
    pagingWhereConditions.push(whereAddendum)
    joins.push(keysetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, node.junctionTableAs, lateralJoinCondition, 'LEFT'))
  } else if (node.orderBy) {
    var { limit, offset, orderColumns } = interpretForOffsetPaging(node) // eslint-disable-line no-redeclare
    joins.push(offsetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, offset, node.junctionTableAs, lateralJoinCondition, 'LEFT'))
  } else {
    throw new Error('"sortKey" or "orderBy" is required if "sqlPaginate" is true')
  }

  joins.push(`LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition}`)

  orders.push({
    table: node.junctionTableAs,
    columns: orderColumns
  })
}

async function handleJoinedManyToManyPaginated(parent, node, prefix, context, selections, joins, wheres, orders, joinCondition1) {
  const pagingWhereConditions = [
    await node.sqlJoins[0](`"${parent.as}"`, node.junctionTable, node.args || {}, context)
  ]
  if (node.where) {
    pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
  }

  if (node.sortKey) {
    var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node) // eslint-disable-line no-redeclare
    pagingWhereConditions.push(whereAddendum)
    joins.push(keysetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, node.junctionTableAs, joinCondition1, 'LEFT'))
  } else if (node.orderBy) {
    var { limit, offset, orderColumns } = interpretForOffsetPaging(node) // eslint-disable-line no-redeclare
    joins.push(offsetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, offset, node.junctionTableAs, joinCondition1, 'LEFT'))
  } else {
    throw new Error('"sortKey" or "orderBy" is required if "sqlPaginate" is true')
  }

  orders.push({
    table: node.junctionTableAs,
    columns: orderColumns
  })
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
) AS "${as}"`
  }
}

function offsetPagingSelect(table, pagingWhereConditions, orderColumns, limit, offset, as, joinCondition, joinType = '') {
  const whereCondition = filter(pagingWhereConditions).join(' AND ') || 'TRUE'
  if (joinCondition) {
    return `\
${joinType} JOIN LATERAL (
  SELECT *, count(*) OVER () AS "$total"
  FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit} OFFSET ${offset}
) AS "${as}" ON ${joinCondition}`
  } else {
    return `\
FROM (
  SELECT *, count(*) OVER () AS "$total"
  FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns)}
  LIMIT ${limit} OFFSET ${offset}
) AS "${as}"`
  }
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

