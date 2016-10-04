import test from 'ava'
import { graphql } from 'graphql'
import schemaRelay from '../example/schema-relay/index'
import { partial } from 'lodash'


const run = partial(graphql, schemaRelay)

test('it should handle the relay connection type', async t => {
  const query = ` {
    user(id: 1) {
      posts {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            body
          }
        }
      }
      comments(first: 2, after: "YXJyYXljb25uZWN0aW9uOjA=") {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            body
          }
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    user: {
      posts: {
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'YXJyYXljb25uZWN0aW9uOjA=',
          endCursor: 'YXJyYXljb25uZWN0aW9uOjA='
        },
        edges: [
          {
            node: {
              id: 'UG9zdDoy',
              body: 'Check out this cool new GraphQL library, Join Monster.'
            }
          }
        ]
      },
      comments: {
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'YXJyYXljb25uZWN0aW9uOjE=',
          endCursor: 'YXJyYXljb25uZWN0aW9uOjI='
        },
        edges: [
          {
            node: {
              id: 'Q29tbWVudDoy',
              body: 'Do not forget to check out the demo.'
            }
          },
          {
            node: {
              id: 'Q29tbWVudDo0',
              body: 'Somebody please help me with thi library. It is so much work.'
            }
          }
        ]
      }
    }
  }
  t.deepEqual(data, expect)
})

