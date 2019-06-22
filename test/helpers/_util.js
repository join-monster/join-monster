import sinon from 'sinon';
import {graphql} from 'graphql';
import schemaBasic from '../../test-api/schema-basic/index';
import * as queryAST from '../../src/query-ast-to-sql-ast/index';

const spy = sinon.spy(queryAST, 'queryASTToSqlAST');

export function buildResolveInfo(query) {
  return graphql(schemaBasic, query).then(() => spy.lastCall.args[0]);
}

export function errCheck(errors) {
  expect(errors).toBeUndefined();
}
