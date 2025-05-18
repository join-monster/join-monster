import test from 'ava'
import { graphql } from 'graphql'
import schema from '../test-api/schema-basic/index'
import { errCheck } from './_util'


test('should handle data from the junction table', async t => {
  const source = `{
    user(id: 3) {
      fullName
      following {
        id
        intimacy
      }
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 1,
          intimacy: 'acquaintance'
        },
        {
          id: 2,
          intimacy: 'best'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('should include alwaysFetch columns from junction table in SQL and not as the first column', async t => {
  const context = { capturedSql: '' }
  
  const source = `{
    user(id: 3) {
      fullName
      following {
        id
      }
    }
  }`
  
  await graphql({schema, source, contextValue: context})
  
  // Extract the SELECT clause
  const selectMatch = context.capturedSql.toLowerCase().match(/select\s+([\s\S]+?)\s+from/i)
  t.truthy(selectMatch, 'Should match SELECT clause')
  
  console.log(`sql = ${context.capturedSql}`)
  const selectClause = selectMatch[1]
    .split(',')
    .map(col => col.trim())

  // Find index of the closeness column
  const closenessIndex = selectClause.findIndex(col =>
  col.replace(/`/g, '').includes('following__closeness') || 
  col.replace(/`/g, '').includes('closeness'))

  t.true(closenessIndex !== -1, 'SQL should include the closeness column')
  t.true(closenessIndex > 0, 'closeness column should not be the first column in the SELECT list')
})

