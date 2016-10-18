import util from 'util'
import assert from 'assert'

export function emphasize(str, colorCode = 33) {
  return `\n\x1b[1;${colorCode}m${str}\x1b[0m\n`
}

export function inspect(obj, options = {}) {
  return util.inspect(obj, { depth: 12, ...options })
}

// really? yes, really
export function last(arr) {
  return arr[arr.length - 1]
}

export function wrap(maybeArr) {
  if (maybeArr.constructor === Array) {
    return maybeArr
  }
  return [ maybeArr ]
}

export function validateSqlAST(topNode) {
  // TODO: this could be a bit more comprehensive
  // topNode should not have a sqlJoin entry...
  assert(topNode.sqlJoin == null)
}

export function objToCursor(obj) {
  const str = JSON.stringify(obj)
  return new Buffer(str).toString('base64')
}

export function cursorToObj(cursor) {
  const str = new Buffer(cursor, 'base64').toString()
  return JSON.parse(str)
}

