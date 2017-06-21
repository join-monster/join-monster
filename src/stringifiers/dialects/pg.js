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
      `"${node.junction.as}"."${node.junction.sqlBatch.thisKey.name}" = temp."${node.junction.sqlBatch.parentKey.name}"`
    ]
    if (node.where) {
      pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, quotePrefix(prefix)))
    }

    const tempTable = `FROM (VALUES ${batchScope.map(val => `(${val})`)}) temp("${node.junction.sqlBatch.parentKey.name}")`
    tables.push(tempTable)
    const lateralJoinCondition = `"${node.junction.as}"."${node.junction.sqlBatch.thisKey.name}" = temp."${node.junction.sqlBatch.parentKey.name}"`

    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      tables.push(keysetPagingSelect(node.junction.sqlTable, pagingWhereConditions, orderColumns, limit, node.junction.as, { joinCondition: lateralJoinCondition, joinType: 'LEFT' }))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      tables.push(offsetPagingSelect(node.junction.sqlTable, pagingWhereConditions, orderColumns, limit, offset, node.junction.as, { joinCondition: lateralJoinCondition, joinType: 'LEFT' }))
    }
    tables.push(`LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition}`)

    orders.push({
      table: node.junction.as,
      columns: orderColumns
    })
  },

  handleJoinedManyToManyPaginated: async function(parent, node, prefix, context, selections, tables, wheres, orders, joinCondition1, joinCondition2) {
    const pagingWhereConditions = [
      await node.junction.sqlJoins[0](`"${parent.as}"`, `"${node.junction.as}"`, node.args || {}, context)
    ]
    if (node.junction.where) {
      pagingWhereConditions.push(await node.junction.where(`"${node.junction.as}"`, node.args || {}, context, quotePrefix(prefix)))
    }
    if (node.where) {
      pagingWhereConditions.push(await node.where(`"${node.as}"`, node.args || {}, context, quotePrefix(prefix)))
    }

    const lateralJoinOptions = { joinCondition: joinCondition1, joinType: 'LEFT' }
    if (node.where || node.orderBy) {
      lateralJoinOptions.extraJoin = {
        name: node.name,
        as: node.as,
        condition: joinCondition2
      }
    }
    if (node.sortKey) {
      var { limit, orderColumns, whereCondition: whereAddendum } = interpretForKeysetPaging(node, dialect) // eslint-disable-line no-redeclare
      pagingWhereConditions.push(whereAddendum)
      tables.push(keysetPagingSelect(node.junction.sqlTable, pagingWhereConditions, orderColumns, limit, node.junction.as, lateralJoinOptions))
    } else if (node.orderBy) {
      var { limit, offset, orderColumns } = interpretForOffsetPaging(node, dialect) // eslint-disable-line no-redeclare
      tables.push(offsetPagingSelect(node.junction.sqlTable, pagingWhereConditions, orderColumns, limit, offset, node.junction.as, lateralJoinOptions))
    }
    orders.push({
      table: node.junction.as,
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
