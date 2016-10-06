import { nest } from 'nesthydrationjs'
const debug = require('debug')('join-monster')

import { queryASTToSqlAST, getGraphQLType } from './queryASTToSqlAST'
import stringifySqlAST from './stringifySqlAST'
import defineObjectShape from './defineObjectShape'
import { emphasize, inspect } from './util'
import util from 'util'

/**
 * Takes the GraphQL AST and returns a nest Object with the data
 * @param {Object} astInfo - Contains the parsed GraphQL query, schema definition, and more. Obtained form the first argument to the resolver.
 * @param {Object} context - An arbitrary object that gets passed to the where function. Useful for contextual infomation that influeces the  WHERE condition, e.g. session, logged in user, localization.
 * @param {Function} dbCall - A function that is passed the compiled SQL that calls the database and returns (a promise of) the data.
 * @returns {Promise<Object>} The correctly nested data from the database.
 */
function joinMonster(ast, context, dbCall) {
  // we need to read the query AST and build a new "SQL AST" from which the SQL and
  const sqlAST = queryASTToSqlAST(ast)
  const { sql, shapeDefinition } = compileSqlAST(sqlAST, context)
  if (!sql) return Promise.resolve({})

  // call their function for querying the DB, handle the different cases, do some validation, return a promise of the object
  return handleUserDbCall(dbCall, sql, shapeDefinition)
}

function compileSqlAST(sqlAST, context) {
  debug(emphasize('SQL_AST'), inspect(sqlAST))

  // now convert the "SQL AST" to sql
  const sql = stringifySqlAST(sqlAST, context)
  debug(emphasize('SQL'), inspect(sql))

  // figure out the shape of the object and define it for the NestHydration library so it can build the object nesting
  const shapeDefinition = defineObjectShape(sqlAST)
  debug(emphasize('SHAPE_DEFINITION'), inspect(shapeDefinition))
  return { sql, shapeDefinition }
}

joinMonster.getNode = (typeName, ast, context, where, dbCall) => {
  const type = ast.schema.getType(typeName)
  const fakeParentNode = {
    _fields: {
      node: {
        type,
        name: type.name.toLowerCase(),
        where
      }
    }
  }
  const sqlAST = {}
  getGraphQLType(ast.fieldASTs[0], fakeParentNode, sqlAST, ast.fragments, new Set)
  const { sql, shapeDefinition } = compileSqlAST(sqlAST, context)
  return handleUserDbCall(dbCall, sql, shapeDefinition).then(obj => {
    obj.__type__ = type
    return obj
  })
}

function handleUserDbCall(dbCall, sql, shapeDefinition) {
  if (dbCall.length === 2) {
    return new Promise((resolve, reject) => {
      dbCall(sql, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          rows = validate(rows)
          debug(emphasize('RAW_DATA'), inspect(rows.slice(0, 10)))
          debug(`${rows.length} rows...`)
          resolve(nest(rows, shapeDefinition))
        }
      })
    })
  }

  const result = dbCall(sql)
  // if their func gave us a promise for the data, wait for the data
  if (result.then) {
    return result.then(rows => {
      rows = validate(rows)
      debug(emphasize('RAW DATA'), inspect(rows.slice(0, 10)))
      debug(`${rows.length} rows...`)
      return nest(rows, shapeDefinition)
    })
  // otherwise, they were supposed to give us the data directly
  } else {
    return Promise.resolve(nest(validate(result), shapeDefinition))
  }
}

function validate(rows) {
  if (Array.isArray(rows)) return rows
  else if (rows.rows) return rows.rows
  else {
    throw new Error(`"dbCall" function must return/resolve an array of objects where each object is a row from the result set. Instead got ${util.inspect(rows, { depth: 3 })}`)
  }
}

joinMonster.version = require('../package.json').version
export default joinMonster

