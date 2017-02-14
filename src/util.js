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
  assert(topNode.sqlJoin == null, 'root level field can not have "sqlJoin"')
}

export function objToCursor(obj) {
  const str = JSON.stringify(obj)
  return new Buffer(str).toString('base64')
}

export function cursorToObj(cursor) {
  const str = new Buffer(cursor, 'base64').toString()
  return JSON.parse(str)
}

// wrap in a pair of single quotes for the SQL if needed
export function maybeQuote(value) {
  if (typeof value === 'number') return value
  if (typeof value.toSQL === 'function') return value.toSQL()

  // Picked from https://github.com/brianc/node-postgres/blob/876018/lib/client.js#L235..L260
  // Ported from PostgreSQL 9.2.4 source code in src/interfaces/libpq/fe-exec.c
  let hasBackslash = false
  let escaped = '\''

  for(let i = 0; i < value.length; i++) {
    let c = value[i]
    if(c === '\'') {
      escaped += c + c
    } else if (c === '\\') {
      escaped += c + c
      hasBackslash = true
    } else {
      escaped += c
    }
  }

  escaped += '\''

  if(hasBackslash === true) {
    escaped = ' E' + escaped
  }

  return escaped
}

export function buildWhereFunction(type, condition, options) {
  if (typeof condition === 'function') {
    return condition
  // otherwise, we'll assume they gave us the value(s) of the unique key.
  } else {
    // determine the type of quotes necessary to escape the uniqueKey column
    const quote = options.dialect === 'mysql' ? '`' : '"'

    // determine the unique key so we know what to search by
    const uniqueKey = type._typeConfig.uniqueKey

    // handle composite keys
    if (Array.isArray(uniqueKey)) {
      // it must have a corresponding array of values
      assert.equal(condition.length, uniqueKey.length, `The unique key for the "${type.name}" type is a composite. You must provide an array of values for each column.`)
      return table => uniqueKey.map((key, i) => `${table}.${quote}${key}${quote} = ${maybeQuote(condition[i])}`).join(' AND ')
    // single keys are simple
    } else {
      return table => `${table}.${quote}${uniqueKey}${quote} = ${maybeQuote(condition)}`
    }
  }
}
