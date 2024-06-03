import sinon from 'sinon'
import { graphql } from 'graphql'
import schemaBasic from '../test-api/schema-basic/index'
import * as queryAST from '../src/query-ast-to-sql-ast/index'

import mysqlModule from '../src/stringifiers/dialects/mysql'
import oracleModule from '../src/stringifiers/dialects/oracle'
import pgModule from '../src/stringifiers/dialects/pg'
import sqlite3Module from '../src/stringifiers/dialects/sqlite3'


const spy = sinon.spy(queryAST, 'queryASTToSqlAST')

export function buildResolveInfo(query) {
  return graphql(schemaBasic, query).then(() => spy.lastCall.args[0])
}

export function errCheck(t, errors) {
  // t.log will report better than console.log, as it will show it contextually next to the test case
  if (errors && errors.length) {
    t.log(errors[0].message)
    t.log(errors[0].stack)
  }
  t.is(errors, undefined)
}

export function getDatabaseOptions(knex) {
  const { MINIFY, ALIAS_PREFIX } = process.env
  const options = {
    minify: +MINIFY === 1,
    aliasPrefix: ALIAS_PREFIX
  }
  const client = knex.client.config.client
  if (client === 'mysql') {
    options.dialectModule = mysqlModule
  } else if (client === 'pg') {
    options.dialectModule = pgModule
  } else if (client === 'oracledb') {
    options.dialectModule = oracleModule
  } else if (client === 'sqlite3') {
    options.dialectModule = sqlite3Module
  }

  return options
}
