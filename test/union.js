import test from 'ava'
import { graphql } from 'graphql'
import schemaBasic from '../test-api/schema-basic/index'
import { partial } from 'lodash'

const run = partial(graphql, schemaBasic)

test('it should a union type', async t => {
  const query = `
    {
      user(id: 1) {
        writtenMaterial {
          __typename
          ... on Comment {
            id
            body
            postId
            likers {
              fullName
            }
          }
          ...postInfo
        }
      }
    }

    fragment postInfo on Post {
      id
      body
    }
  `
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    user: {
      writtenMaterial: [
        {
          __typename: 'Comment',
          id: 1,
          body: 'Wow this is a great post, Matt.',
          postId: 1,
          likers: [ { fullName: 'matt elder' } ]
        },
        {
          id: 2,
          __typename: 'Post',
          body: 'Check out this cool new GraphQL library, Join Monster.'
        },
        {
          __typename: 'Comment',
          id: 4,
          body: 'Do not forget to check out the demo.',
          postId: 2,
          likers: []
        },
        {
          __typename: 'Comment',
          id: 6,
          body: 'Also, submit a PR if you have a feature you want to add.',
          postId: 2,
          likers: []
        },
        {
          __typename: 'Comment',
          id: 8,
          body: 'Somebody please help me with this library. It is so much work.',
          postId: 2,
          likers: []
        }
      ]
    }
  }
  t.deepEqual(data, expect)
})

