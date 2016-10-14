import util from 'util'
import assert from 'assert'

export function emphasize(str, colorCode = 33) {
  return `\n\x1b[1;${colorCode}m${str}\x1b[0m\n`
}

export function inspect(obj, options = {}) {
  return util.inspect(obj, { depth: 12, ...options })
}

export function validateSqlAST(topNode) {
  // topNode should not have a sqlJoin entry...
  assert(topNode.sqlJoin == null)
}

export function base64(str) {
  return new Buffer(str).toString('base64')
}

export function parseCursor(opaque) {
  const clear = new Buffer(opaque, 'base64').toString()
  const [ _, value ] = clear.split(':')
  return value
}
