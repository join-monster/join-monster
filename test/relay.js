import test from 'ava'
import { graphql } from 'graphql'
import schemaRelay from '../example/schema-relay/index'
import { partial } from 'lodash'


const run = partial(graphql, schemaRelay)

test('it should fetch a Node type with inline fragments', async t => {
  const query = `{
    node(id: "UG9zdDox") {
      ... on Post { body }
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = { node: { body: 'If I could marry a programming language, it would be Haskell.' } }
  t.deepEqual(data, expect)
})

test('it should fetch a Node type with named fragments', async t => {
  const query = `
    {
      node(id: "VXNlcjox") {
        ...F0
      }
    }
    fragment F0 on User {
      fullName
      comments(first:2) {
        pageInfo { hasNextPage }
      }
    }
  `
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    node: {
      fullName: 'andrew carlson',
      comments: {
        pageInfo: { hasNextPage: true }
      }
    }
  }
  t.deepEqual(data, expect)
})

test('it should handle the relay connection type', async t => {
  const query = `{
    user(id: 1) {
      fullName
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
      fullName: 'andrew carlson',
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

test('it should handle nested connection types', async t => {
  const query = `{
    user(id: 1) {
      fullName
      posts(first: 5) {
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
        edges {
          cursor
          node {
            id
            body
            comments (first: 2) {
              pageInfo {
                hasNextPage
              }
              edges {
                node {
                  id
                  body
                }
              }
            }
          }
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    user: {
      fullName: 'andrew carlson',
      posts: {
        pageInfo: {
          hasPreviousPage: false,
          hasNextPage: false,
          startCursor: 'YXJyYXljb25uZWN0aW9uOjA=',
          endCursor: 'YXJyYXljb25uZWN0aW9uOjA='
        },
        edges: [
          {
            cursor: 'YXJyYXljb25uZWN0aW9uOjA=',
            node: {
              id: 'UG9zdDoy',
              body: 'Check out this cool new GraphQL library, Join Monster.',
              comments: {
                pageInfo: {
                  hasNextPage: true
                },
                edges: [
                  {
                    node: {
                      id: 'Q29tbWVudDoz',
                      body: 'Also, submit a PR if you have a feature you want to add.'
                    }
                  },
                  {
                    node: {
                      id: 'Q29tbWVudDoy',
                      body: 'Do not forget to check out the demo.'
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    }
  }
  t.deepEqual(data, expect)
})

