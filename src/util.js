import util from 'util'
import assert from 'assert'
import { nest } from 'nesthydrationjs'
import stringifySQL from './stringifiers/dispatcher'
const debug = require('debug')('join-monster')

import defineObjectShape from './define-object-shape'

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
export function maybeQuote(value, dialectName) {
  if (typeof value === 'number') return value
  if (value && typeof value.toSQL === 'function') return value.toSQL()

  if (dialectName === 'oracle' && value.match(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(.\d+)?Z?/)) {
    return value.replace(/(\d{4}-\d\d-\d\d)T(\d\d:\d\d:\d\d)(.\d+)?Z?/, "TIMESTAMP '$1 $2$3 UTC'") // eslint-disable-line quotes
  }

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
    const quote = [ 'mysql', 'mariadb' ].includes(options.dialect) ? '`' : '"'

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

// handles the different callback signatures and return values.
export function handleUserDbCall(dbCall, sql, shapeDefinition) {
  // if there are two args, we're in "callback mode"
  if (dbCall.length === 2) {
    // wrap it in a promise
    return new Promise((resolve, reject) => {
      // wait for them to call "done"
      dbCall(sql, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          rows = validate(rows)
          debug(emphasize('RAW_DATA'), inspect(rows.slice(0, 8)))
          debug(`${rows.length} rows...`)
          resolve(nest(rows, shapeDefinition))
        }
      })
    })
  }

  // otherwise, we are expecting a promise of the data
  const result = dbCall(sql)
  if (typeof result.then === 'function') {
    return result.then(rows => {
      rows = validate(rows)
      debug(emphasize('RAW DATA'), inspect(rows.slice(0, 8)))
      debug(`${rows.length} rows...`)
      // hydrate the data
      // take that shape definition we produced and pass it to the NestHydrationJS library
      return nest(rows, shapeDefinition)
    })
  } else {
    throw new Error('must return a promise of the data or use the callback')
  }
}

// validate the data they gave us
function validate(rows) {
  // its supposed to be an array of objects
  if (Array.isArray(rows)) return rows
  // a check for the most common error. a lot of ORMs return an object with the desired data on the `rows` property
  else if (rows && rows.rows) return rows.rows
  else {
    throw new Error(`"dbCall" function must return/resolve an array of objects where each object is a row from the result set. Instead got ${util.inspect(rows, { depth: 3 })}`)
  }
}

export async function compileSqlAST(sqlAST, context, options) {
  debug(emphasize('SQL_AST'), inspect(sqlAST))

  // now convert the "SQL AST" to sql
  options.dialect = options.dialect || 'sqlite3'
  if (options.dialect === 'standard') {
    console.warn('dialect "standard" is deprecated, because there is no true implementation of the SQL standard')
    console.warn('"sqlite3" is the default')
    options.dialect = 'sqlite3'
  }
  const sql = await stringifySQL(sqlAST, context, options)
  debug(emphasize('SQL'), sql)

  // figure out the shape of the object and define it so later we can pass it to NestHydration library so it can hydrate the data
  const shapeDefinition = defineObjectShape(sqlAST)
  debug(emphasize('SHAPE_DEFINITION'), inspect(shapeDefinition))
  return { sql, shapeDefinition }
}

