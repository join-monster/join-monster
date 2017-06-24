import test from 'ava'
import { graphql } from 'graphql'
import schemaBasic from '../test-api/schema-basic/index'
import { partial } from 'lodash'

const run = partial(graphql, schemaBasic)

test('it should handle duplicate scalar field', async t => {
  const query = `{
    user(id: 1) {
      fullName
      fullName
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    user: {
      fullName: 'andrew carlson'
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle duplicate object type field', async t => {
  const query = `{
    user(id: 1) {
      posts {
        body
        authorId
      }
      posts {
        authorId
      }
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    user: {
      posts: [
        {
          body: 'Check out this cool new GraphQL library, Join Monster.',
          authorId: 1
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test.skip('it should handle duplicate object type fields with different arguments', async t => {
  const query = `{
    user(id: 3) {
      comments: comments(active: true) {
        id
      }
      archivedComments: comments(active: false) {
        id
      }
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    user: {
      comments: [
        { id: 3 },
        { id: 5 },
        { id: 9 }
      ],
      archivedComments: [
        { id: 2 },
        { id: 3 },
        { id: 5 },
        { id: 9 }
      ]
    }
  }
  t.deepEqual(expect, data)
})

