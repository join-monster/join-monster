//import {
  //keysetPagingSelect,
  //offsetPagingSelect,
  //interpretForOffsetPaging,
  //interpretForKeysetPaging,
  //quotePrefix
//} from '../shared'

function recursiveConcat(keys) {
  if (keys.length <= 1) {
    return keys[0]
  }
  return recursiveConcat([ `CONCAT(${keys[0]}, ${keys[1]})`, ...keys.slice(2) ])
}

module.exports = {
  ...require('./pg'),
  name: 'oracle',
  
  compositeKey(parent, keys) {
    keys = keys.map(key => `"${parent}"."${key}"`)
    return `NULLIF(${recursiveConcat(keys)}, '')`
  },
}
