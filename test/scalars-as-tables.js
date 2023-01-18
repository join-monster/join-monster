import test from 'ava'
import { graphql } from 'graphql'
import schemaRelay from '../test-api/schema-paginated/index'
import { errCheck } from './_util'

const run = (requestString, rootValue, contextValue) => graphql(schemaRelay, requestString, rootValue, contextValue)

test('it should get a scalar list and resolve it', async t => {
  const { data, errors } = await run(`
    query {
      post(id: 1) {
        id
        tags
      }
    }
  `)

  errCheck(t, errors)
  t.deepEqual(['foo', 'bar', 'baz'], data.post.tags)
})
