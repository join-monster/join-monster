function quote(str) {
  return `"${str}"`
}


module.exports = {
  ...require('./mixins/pagination-not-supported'),

  name: 'mysql',

  quote,

  limit(limit) {
    return ` LIMIT ${limit} `
  },

  compositeKey(parent, keys) {
    keys = keys.map(key => `${quote(parent)}.${quote(key)}`)
    return keys.join(' || ')
  }
}
