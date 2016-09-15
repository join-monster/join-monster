import util from 'util'
import { nest } from 'nesthydrationjs'
const debug = require('debug')('join-monster')

import queryASTToSqlAST from './queryASTToSqlAST'
import stringifySqlAST from './stringifySqlAST'
import makeNestHydrationSpec from './makeNestHydrationSpec'


module.exports = (ast, dbCall) => {
  // we need to read the query AST and build a new "SQL AST" from which the SQL and
  // the spec for the Nest Hydration will be determined
  const sqlAST = queryASTToSqlAST(ast)
  debug('\nSQL_AST\n', util.inspect(sqlAST, { depth: 10 }))

  // now convert the "SQL AST" to sql
  const sql = stringifySqlAST(sqlAST)
  debug('\nSQL\n', util.inspect(sql, null, null))

  // and generate the nest hydration spec
  const nestSpec = makeNestHydrationSpec(sqlAST)
  debug('\nNEST_SPEC\n', util.inspect(nestSpec, { depth: 10 }))

  const result = dbCall(sql)
  // if their func gave us a promise for the data, wait for the data
  if (result.then) {
    return result.then(rows => {
      debug('\nRAW DATA\n', util.inspect(rows, { depth: 10 }))
      return nest(rows, nestSpec)
    })
  // otherwise, they were supposed to give us the data
  } else { // WARNING: this path is untested
    return Promise.resolve(nest(result, nestSpec))
  }
}

