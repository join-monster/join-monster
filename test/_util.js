import sinon from 'sinon'
import { graphql } from 'graphql'
import schemaBasic from '../test-api/schema-basic/index'
import * as queryAST from '../src/query-ast-to-sql-ast/index'

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
  const { PAGINATE, STRATEGY, MINIFY, ALIAS_PREFIX, DB } = process.env
  const options = {
    minify: +MINIFY === 1,
    aliasPrefix: ALIAS_PREFIX,
    db: DB,
    strategy: STRATEGY,
    paginate: PAGINATE,
  }
  const client = knex.client.config.client
  if (client === 'mysql') {
    options.dialect = PAGINATE ? 'mysql8' : 'mysql'
  } else if (client === 'pg') {
    options.dialect = 'pg'
  } else if (client === 'oracledb') {
    options.dialect = 'oracle'
  } else if (client === 'sqlite3') {
    options.dialect = 'sqlite3'
  }

  return options
}
