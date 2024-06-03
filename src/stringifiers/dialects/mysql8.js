function quote(str) {
  return `\`${str}\``
}

module.exports = {
  ...require('./mariadb'),

  name: 'mysql8',

  quote,

  compositeKey(parent, keys) {
    keys = keys.map(key => `${quote(parent)}.${quote(key)}`)
    return `CONCAT(${keys.join(', ')})`
  }
}
