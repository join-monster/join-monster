import {
  interpretForOffsetPaging,
  offsetPagingSelect
} from '../shared'

function quote(str) {
  return `"${str}"`
}

module.exports = {
  ...require('./mixins/pagination-not-supported'),

  name: 'sqlite3',

  quote,

  compositeKey(parent, keys) {
    keys = keys.map(key => `${quote(parent)}.${quote(key)}`)
    return keys.join(' || ')
  },

  handlePaginationAtRoot: async function(parent, node, context, tables) {
    const pagingWhereConditions = []
    
    if (node.orderBy) {
      const { limit, offset, order } = interpretForOffsetPaging(node, { name: 'sqlite3' })
      if (node.where) {
        pagingWhereConditions.push(
          await node.where(`"${node.as}"`, node.args || {}, context, node)
        )
      }
      tables.push(
        offsetPagingSelect(
          node.name,
          pagingWhereConditions,
          order,
          limit,
          offset,
          node.as
        )
      )
    }
  },
}
