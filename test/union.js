import test from 'ava'
import { graphql } from 'graphql'
import schemaBasic from '../example/schema-basic/index'
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
  data.user.writtenMaterial.sort((a, b) => a.id - b.id)
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
        }
      ]
    }
  }
  t.deepEqual(data, expect)
})

