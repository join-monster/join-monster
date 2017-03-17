import {
  keysetPagingSelect,
  offsetPagingSelect,
  interpretForOffsetPaging,
  interpretForKeysetPaging,
  quotePrefix
} from '../shared'

const dialect = module.exports = {
  name: 'pg',

  quote(str) {
    return `"${str}"`
  },

  compositeKey(parent, keys) {
    keys = keys.map(key => `"${parent}"."${key}"`)
    return `NULLIF(CONCAT(${keys.join(', ')}), '')`
  },

  handleJoinedOneToManyPaginated: async function(parent, node, prefix, context, selections, tables, wheres, orders, joinCondition) {
    const pagingWhereConditions = [
      await node.sqlJoin(`"${parent.as}"`, `"${node.as}"`, node.args || {}, context),
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

  handleBatchedManyToManyPaginated: async function(parent, node, prefix, context, selections, tables, wheres, orders, batchScope, joinCondition) {
    const pagingWhereConditions = [
      `"${node.junctionTableAs}"."${node.junctionBatch.thisKey.name}" = temp."${node.junctionBatch.parentKey.name}"`
    ]
    if (node.where) {
      pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, quotePrefix(prefix)))
    }

    const tempTable = `FROM (VALUES ${batchScope.map(val => `(${val})`)}) temp("${node.junctionBatch.parentKey.name}")`
    tables.push(tempTable)
    const lateralJoinCondition = `"${node.junctionTableAs}"."${node.junctionBatch.thisKey.name}" = temp."${node.junctionBatch.parentKey.name}"`

    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      tables.push(keysetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, node.junctionTableAs, { joinCondition: lateralJoinCondition, joinType: 'LEFT' }))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      tables.push(offsetPagingSelect(node.junctionTable, pagingWhereConditions, orderColumns, limit, offset, node.junctionTableAs, { joinCondition: lateralJoinCondition, joinType: 'LEFT' }))
    }
    tables.push(`LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition}`)

    orders.push({
      table: node.junctionTableAs,
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

  handleBatchedOneToManyPaginated: async function(parent, node, prefix, context, selections, tables, wheres, orders, batchScope) {
    const pagingWhereConditions = [
      `"${node.as}"."${node.sqlBatch.thisKey.name}" = temp."${node.sqlBatch.parentKey.name}"`
    ]
    if (node.where) {
      pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, []))
    }
    const tempTable = `FROM (VALUES ${batchScope.map(val => `(${val})`)}) temp("${node.sqlBatch.parentKey.name}")`
    tables.push(tempTable)
    const lateralJoinCondition = `"${node.as}"."${node.sqlBatch.thisKey.name}" = temp."${node.sqlBatch.parentKey.name}"`
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
  }

}
