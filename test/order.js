import test from 'ava'
import { graphql } from 'graphql'
import schemaBasic from '../test-api/schema-basic/index'
import { partial } from 'lodash'

function makeQuery(asc) {
  return `{
    user(id: 1) {
      posts {
        id
        comments(asc:${asc}) {
          id
        }
      }
      comments {
        id
      }
    }
  }`
}


const run = partial(graphql, schemaBasic)

test('it should handle nested ordering with both ASC', async t => {
  const query = makeQuery(true)
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual([ { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 } ], data.user.posts[0].comments)
  t.deepEqual([ { id: 1 }, { id: 4 }, { id: 6 }, { id: 8 } ], data.user.comments)
})

test('it should handle nested ordering with one ASC and one DESC', async t => {
  const query = makeQuery(false)
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual([ { id: 8 }, { id: 7 }, { id: 6 }, { id: 5 }, { id: 4 } ], data.user.posts[0].comments)
  t.deepEqual([ { id: 1 }, { id: 4 }, { id: 6 }, { id: 8 } ], data.user.comments)
})

