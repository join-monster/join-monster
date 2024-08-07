import {
  interpretForOffsetPaging,
  offsetPagingSelect
} from '../shared'

function quote(str) {
  return `\`${str}\``
}

module.exports = {
  ...require('./mixins/pagination-not-supported'),

  name: 'mysql',

  quote,

  compositeKey(parent, keys) {
    keys = keys.map(key => `${quote(parent)}.${quote(key)}`)
    return `CONCAT(${keys.join(', ')})`
  },

  handlePaginationAtRoot: async function(parent, node, context, tables) {
    const pagingWhereConditions = []
    
    if (node.orderBy) {
      const { limit, offset, order } = interpretForOffsetPaging(node, { name: 'mysql' })
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
          node.as,
          { q: quote }
        )
      )
    }
  }
}
