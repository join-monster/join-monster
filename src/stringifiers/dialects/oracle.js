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

function keysetPagingSelect(table, whereCondition, orderColumns, limit, as, options = {}) {
  let { joinCondition, joinType } = options
  const q = str => `"${str}"`
  whereCondition = filter(whereCondition).join(' AND ')
  if (joinCondition) {
    return `\
${ joinType === 'LEFT' ? 'OUTER' : 'CROSS' } APPLY (
  SELECT * FROM ${table}
  ${whereCondition? `WHERE ${whereCondition}` : '' }
  ORDER BY ${orderColumnsToString(orderColumns, q)}
) ${q(as)} ON ${joinCondition}`
  } else {
    return `\
FROM (
  SELECT * FROM ${table}
  ${whereCondition? `WHERE ${whereCondition}` : '' }
  ORDER BY ${orderColumnsToString(orderColumns, q)}

) ${q(as)}`
  }
}

function offsetPagingSelect(table, pagingWhereConditions, orderColumns, limit, offset, as, options = {}) {
  let { joinCondition, joinType } = options
  const q = str => `"${str}"`
  const whereCondition = filter(pagingWhereConditions).join(' AND ') || '1 = 1'
  if (joinCondition) {
    return `\
${joinType === 'LEFT' ? 'OUTER': 'CROSS'} APPLY (
  SELECT ${table}.*, count(*) OVER () AS ${q('$total')}
  FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns, q)}
  OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
)`
  } else {
    return `\
FROM (
  SELECT ${table}.*, count(*) OVER () AS ${q('$total')}
  FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns, q)}
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
        pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
      }
      tables.push(keysetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, node.as))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      if (node.where) {
        pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
      }
      tables.push(offsetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, offset, node.as))
    } else {
      throw new Error('"sortKey" or "orderBy" is required if "sqlPaginate" is true')
    }

    orders.push({
      table: node.as,
      columns: orderColumns
    })

  },

  handleJoinedOneToManyPaginated: async function(parent, node, prefix, context, selections, tables, wheres, orders, joinCondition) {
    const pagingWhereConditions = [
      await node.sqlJoin(`"${parent.as}"`, node.name, node.args || {}, context),
    ]
    if (node.where) {
      pagingWhereConditions.push(await node.where(`${node.name}`, node.args || {}, context, quotePrefix(prefix)))
    }

    // which type of pagination are they using?
    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect)
      pagingWhereConditions.push(whereAddendum)
      tables.push(keysetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, node.as, { joinCondition, joinType: 'LEFT' }))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      tables.push(offsetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, offset, node.as, { joinCondition, joinType: 'LEFT' }))
    } else {
      throw new Error('"sortKey" or "orderBy" is required if "sqlPaginate" is true')
    }

    orders.push({
      table: node.as,
      columns: orderColumns
    })
  },
}

