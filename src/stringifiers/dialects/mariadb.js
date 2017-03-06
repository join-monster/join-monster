import {
  keysetPagingSelect,
  offsetPagingSelect,
  interpretForOffsetPaging,
  interpretForKeysetPaging,
  quotePrefix,
  orderColumnsToString
} from '../shared'

import { filter } from 'lodash'


function quote(str) {
  return `\`${str}\``
}

function joinUnions(unions, as) {
  return `FROM (
${unions.join('\nUNION\n')}
) AS ${quote(as)}`
}

function paginatedSelect(table, as, whereConditions, orderColumns, limit, offset, withTotal = false) {
  return `\
  (SELECT *${withTotal ? ', count(*) OVER () AS `$total`': '' }
  FROM ${table} ${quote(as)}
  WHERE ${whereConditions}
  ORDER BY ${orderColumnsToString(orderColumns, quote)}
  LIMIT ${limit}${offset ? ' OFFSET ' + offset : ''})`
}

const dialect = module.exports = {
  ...require('./mixins/pagination-not-supported'),

  name: 'mariadb',

  quote,

  compositeKey(parent, keys) {
    keys = keys.map(key => `${quote(parent)}.${quote(key)}`)
    return `CONCAT(${keys.join(', ')})`
  },

  handlePaginationAtRoot: async function(parent, node, prefix, context, selections, joins, wheres, orders) {
    const pagingWhereConditions = []
    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      if (node.where) {
        pagingWhereConditions.push(await node.where(`${quote(node.as)}`, node.args || {}, context, quotePrefix(prefix, quote)))
      }
      joins.push(keysetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, node.as, { q: quote }))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      if (node.where) {
        pagingWhereConditions.push(await node.where(`${quote(node.as)}`, node.args || {}, context, quotePrefix(prefix, quote)))
      }
      joins.push(offsetPagingSelect(node.name, pagingWhereConditions, orderColumns, limit, offset, node.as, { q: quote }))
    }
    orders.push({
      table: node.as,
      columns: orderColumns
    })
  },

  handleBatchedOneToManyPaginated: async function(parent, node, prefix, context, selections, joins, wheres, orders, batchScope) {
    const pagingWhereConditions = []
    if (node.where) {
      pagingWhereConditions.push(await node.where(`${quote(node.as)}`, node.args || {}, context, quotePrefix(prefix, quote)))
    }
    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      const unions = batchScope.map(val => {
        let whereConditions = [ ...pagingWhereConditions, `${quote(node.as)}.${quote(node.sqlBatch.thisKey.name)} = ${val}` ]
        whereConditions = filter(whereConditions).join(' AND ') || '1'
        return paginatedSelect(node.name, node.as, whereConditions, orderColumns, limit, offset, true)
      })
      joins.push(joinUnions(unions, node.as))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      const unions = batchScope.map(val => {
        let whereConditions = [ ...pagingWhereConditions, `${quote(node.as)}.${quote(node.sqlBatch.thisKey.name)} = ${val}` ]
        whereConditions = filter(whereConditions).join(' AND ') || '1'
        return paginatedSelect(node.name, node.as, whereConditions, orderColumns, limit, offset, true)
      })
      joins.push(joinUnions(unions, node.as))
    }
    orders.push({
      table: node.as,
      columns: orderColumns
    })
  },

  handleBatchedManyToManyPaginated: async function(parent, node, prefix, context, selections, joins, wheres, orders, batchScope, joinCondition) {
    const pagingWhereConditions = []
    if (node.where) {
      pagingWhereConditions.push(await node.where(`${quote(node.as)}`, node.args || {}, context, quotePrefix(prefix, quote)))
    }
    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      const unions = batchScope.map(val => {
        let whereConditions = [ ...pagingWhereConditions, `${quote(node.junctionTableAs)}.${quote(node.junctionBatch.thisKey.name)} = ${val}` ]
        whereConditions = filter(whereConditions).join(' AND ') || '1'
        return paginatedSelect(node.junctionTable, node.junctionTableAs, whereConditions, orderColumns, limit, offset, true)
      })
      joins.push(joinUnions(unions, node.junctionTableAs))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      const unions = batchScope.map(val => {
        let whereConditions = [ ...pagingWhereConditions, `${quote(node.junctionTableAs)}.${quote(node.junctionBatch.thisKey.name)} = ${val}` ]
        whereConditions = filter(whereConditions).join(' AND ') || '1'
        return paginatedSelect(node.junctionTable, node.junctionTableAs, whereConditions, orderColumns, limit, offset, true)
      })
      joins.push(joinUnions(unions, node.junctionTableAs))
    }
    joins.push(`LEFT JOIN ${node.name} AS ${quote(node.as)} ON ${joinCondition}`)
    orders.push({
      table: node.junctionTableAs,
      columns: orderColumns
    })
  }
}
