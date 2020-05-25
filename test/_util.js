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
    // the stack traces get super long with ava becuase it adds a ton of stack frames below each test case
    // lets chop the error messages to focues on the stuff coming from source code
    t.log(
      errors[0].stack
        .split('\n')
        .slice(0, -40)
        .join('\n')
    )
  }
  t.is(errors, undefined)
}
