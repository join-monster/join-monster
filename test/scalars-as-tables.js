import test from 'ava'
import { graphql } from 'graphql'
import schema from '../test-api/schema-paginated/index'
import { errCheck } from './_util'


test('it should get a scalar list and resolve it', async t => {
  const source = `
    query {
      post(id: 1) {
        id
        tags
      }
    }
  `
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  t.deepEqual(['foo', 'bar', 'baz'], data.post.tags)
})
