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
  }
}
