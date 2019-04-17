import test from 'ava'
import { graphql } from 'graphql'
import schemaBasic from '../test-api/schema-basic/index'
import { partial } from 'lodash'
import { errCheck } from './_util'

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
  errCheck(t, errors)
  t.deepEqual([ { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 } ], data.user.posts[0].comments)
  t.deepEqual([ { id: 1 }, { id: 4 }, { id: 6 }, { id: 8 } ], data.user.comments)
})

test('it should handle nested ordering with one ASC and one DESC', async t => {
  const query = makeQuery(false)
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual([ { id: 8 }, { id: 7 }, { id: 6 }, { id: 5 }, { id: 4 } ], data.user.posts[0].comments)
  t.deepEqual([ { id: 1 }, { id: 4 }, { id: 6 }, { id: 8 } ], data.user.comments)
})

test('it should handle order on many-to-many', async t => {
  const query = `{
    user(id: 3) {
      fullName
      following {
        id
        fullName
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 1,
          fullName: 'andrew carlson'
        },
        {
          id: 2,
          fullName: 'matt elder'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('it sould handle order on many-to-many', async t => {
  const query = `{
    user(id: 3) {
      fullName
      following(oldestFirst: true) {
        id
        fullName
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 2,
          fullName: 'matt elder'
        },
        {
          id: 1,
          fullName: 'andrew carlson'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})
