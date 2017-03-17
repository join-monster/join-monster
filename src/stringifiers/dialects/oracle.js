import {
  interpretForOffsetPaging,
  interpretForKeysetPaging,
  quotePrefix,
  orderColumnsToString
} from '../shared'
import { filter } from 'lodash'

function recursiveConcat(keys) {
  if (keys.length <= 1) {
    return keys[0]
  }
  return recursiveConcat([ `CONCAT(${keys[0]}, ${keys[1]})`, ...keys.slice(2) ])
}

const q = str => `"${str}"`

function keysetPagingSelect(table, whereCondition, orderColumns, limit, as, options = {}) {
  let { joinCondition, joinType } = options
  const q = str => `"${str}"`
  whereCondition = filter(whereCondition).join(' AND ')
  if (joinCondition) {
    return `\
${ joinType === 'LEFT' ? 'OUTER' : 'CROSS' } APPLY (
  SELECT *
  FROM ${table} "${as}"
  ${whereCondition? `WHERE ${whereCondition}` : '' }
  ORDER BY ${orderColumnsToString(orderColumns, q, as)}
  FETCH FIRST ${limit} ROWS ONLY
) ${q(as)}`
  } else {
    return `\
FROM (
  SELECT *
  FROM ${table} "${as}"
  ${whereCondition? `WHERE ${whereCondition}` : '' }
  ORDER BY ${orderColumnsToString(orderColumns, q, as)}
  FETCH FIRST ${limit} ROWS ONLY
) ${q(as)}`
  }
}

function offsetPagingSelect(table, pagingWhereConditions, orderColumns, limit, offset, as, options = {}) {
  let { joinCondition, joinType } = options
  const whereCondition = filter(pagingWhereConditions).join(' AND ') || '1 = 1'
  if (joinCondition) {
    return `\
${joinType === 'LEFT' ? 'OUTER': 'CROSS'} APPLY (
  SELECT "${as}".*, count(*) OVER () AS ${q('$total')}
  FROM ${table} "${as}"
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns, q, as)}
  OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
) ${q(as)}`
  } else {
    return `\
FROM (
  SELECT "${as}".*, count(*) OVER () AS ${q('$total')}
  FROM ${table} "${as}"
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns, q, as)}
  OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
) ${q(as)}`
  }
}

const dialect = module.exports = {
  ...require('./pg'),
  name: 'oracle',
  
  compositeKey(parent, keys) {
    keys = keys.map(key => `"${parent}"."${key}"`)
    return `NULLIF(${recursiveConcat(keys)}, '')`
  },

  handlePaginationAtRoot: async function(parent, node, prefix, context, selections, tables, wheres, orders) {
    const pagingWhereConditions = []
    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      if (node.where) {
        pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, quotePrefix(prefix)))
      }
      tables.push(keysetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, node.as))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      if (node.where) {
        pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, quotePrefix(prefix)))
      }
      tables.push(offsetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, offset, node.as))
    }
    orders.push({
      table: node.as,
      columns: orderColumns
    })

  },

  handleJoinedOneToManyPaginated: async function(parent, node, prefix, context, selections, tables, wheres, orders, joinCondition) {
    const pagingWhereConditions = [
      await node.sqlJoin(`"${parent.as}"`, q(node.as), node.args || {}, context),
    ]
    if (node.where) {
      pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, quotePrefix(prefix)))
    }

    // which type of pagination are they using?
    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect)
      pagingWhereConditions.push(whereAddendum)
      tables.push(keysetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, node.as, { joinCondition, joinType: 'LEFT' }))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      tables.push(offsetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, offset, node.as, { joinCondition, joinType: 'LEFT' }))
    }
    orders.push({
      table: node.as,
      columns: orderColumns
    })
  },

  handleJoinedManyToManyPaginated: async function(parent, node, prefix, context, selections, tables, wheres, orders, joinCondition1) {
    const pagingWhereConditions = [
      await node.sqlJoins[0](`"${parent.as}"`, `"${node.junctionTableAs}"`, node.args || {}, context)
    ]
    if (node.where) {
      pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, quotePrefix(prefix)))
    }

    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      tables.push(keysetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, node.junctionTableAs, { joinCondition: joinCondition1, joinType: 'LEFT' }))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      tables.push(offsetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, offset, node.junctionTableAs, { joinCondition: joinCondition1, joinType: 'LEFT' }))
    }
    orders.push({
      table: node.junctionTableAs,
      columns: orderColumns
    })
  },

  handleBatchedOneToManyPaginated: async function(parent, node, prefix, context, selections, tables, wheres, orders, batchScope) {
    const pagingWhereConditions = [
      `"${node.as}"."${node.sqlBatch.thisKey.name}" = "temp"."value"`
    ]
    if (node.where) {
      pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, []))
    }
    tables.push(`FROM (${arrToTableUnion(batchScope)}) "temp"`)
    const lateralJoinCondition = `"${node.as}"."${node.sqlBatch.thisKey.name}" = "temp"."value"`
    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      tables.push(keysetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, node.as, { joinCondition: lateralJoinCondition }))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      tables.push(offsetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, offset, node.as, { joinCondition: lateralJoinCondition }))
    }
    orders.push({
      table: node.as,
      columns: orderColumns
    })
  },

  handleBatchedManyToManyPaginated: async function(parent, node, prefix, context, selections, tables, wheres, orders, batchScope, joinCondition) {
    const pagingWhereConditions = [
      `"${node.junctionTableAs}"."${node.junctionBatch.thisKey.name}" = "temp"."value"`
    ]
    if (node.where) {
      pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, quotePrefix(prefix)))
    }

    tables.push(`FROM (${arrToTableUnion(batchScope)}) "temp"`)
    const lateralJoinCondition = `"${node.junctionTableAs}"."${node.junctionBatch.thisKey.name}" = "temp"."value"`

    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      tables.push(keysetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, node.junctionTableAs, { joinCondition: lateralJoinCondition, joinType: 'LEFT' }))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      tables.push(offsetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, offset, node.junctionTableAs, { joinCondition: lateralJoinCondition, joinType: 'LEFT' }))
    }
    tables.push(`LEFT JOIN ${node.name} "${node.as}" ON ${joinCondition}`)

    orders.push({
      table: node.junctionTableAs,
      columns: orderColumns
    })
  },
}


function arrToTableUnion(arr) {
  return arr.map(val => `
  SELECT ${val} AS "value" FROM DUAL
`).join(' UNION ')
}
