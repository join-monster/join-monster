import test from 'ava'
import { graphql } from 'graphql'
import { toGlobalId, offsetToCursor } from 'graphql-relay'
import schemaRelay from '../test-api/schema-paginated/index'
import { partial } from 'lodash'
import { errCheck } from './_util'

const run = partial(graphql, schemaRelay)

const user1Id = toGlobalId('User', 1)
const cursor0 = offsetToCursor(0)

test('it should get a globalId', async t => {
  const query = `{
    user(id:1) { id }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = { user: { id: user1Id } }
  t.deepEqual(expect, data)
})

test('it should fetch a Node type with inline fragments', async t => {
  const query = `{
    node(id: "${toGlobalId('Post', 1)}") {
      ... on Post { body }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    node: {
      body: 'If I could marry a programming language, it would be Haskell.'
    }
  }
  t.deepEqual(expect, data)
})

test('it should fetch a Node type with named fragments', async t => {
  const query = `
    {
      node(id: "${user1Id}") {
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
  errCheck(t, errors)
  const expect = {
    node: {
      fullName: 'andrew carlson',
      comments: {
        pageInfo: { hasNextPage: true }
      }
    }
  }
  t.deepEqual(expect, data)
})

test('it should fetch a Node type with a variable', async t => {
  const query = `
    query node($id: ID!){
      node(id: $id) {
        ...on User {
          fullName
        }
      }
    }
  `
  const variables = { id: user1Id }
  const { data, errors } = await graphql(
    schemaRelay,
    query,
    null,
    null,
    variables
  )
  errCheck(t, errors)
  const expect = {
    node: {
      fullName: 'andrew carlson'
    }
  }
  t.deepEqual(expect, data)
})

test('it should not error when no record is returned ', async t => {
  const query = `
    query node($id: ID!){
      node(id: $id) {
        ...on User {
          fullName
        }
      }
    }
  `
  const variables = { id: toGlobalId('User', 999) }
  const { data, errors } = await graphql(
    schemaRelay,
    query,
    null,
    null,
    variables
  )
  errCheck(t, errors)
  const expect = {
    node: null
  }
  t.deepEqual(expect, data)
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
      comments(first: 2, after: "${cursor0}") {
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
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'andrew carlson',
      posts: {
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: cursor0,
          endCursor: cursor0
        },
        edges: [
          {
            node: {
              id: toGlobalId('Post', 2),
              body: 'Check out this cool new GraphQL library, Join Monster.'
            }
          }
        ]
      },
      comments: {
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: offsetToCursor(1),
          endCursor: offsetToCursor(2)
        },
        edges: [
          {
            node: {
              id: toGlobalId('Comment', 4),
              body: 'Do not forget to check out the demo.'
            }
          },
          {
            node: {
              id: toGlobalId('Comment', 6),
              body: 'Also, submit a PR if you have a feature you want to add.'
            }
          }
        ]
      }
    }
  }
  t.deepEqual(expect, data)
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
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'andrew carlson',
      posts: {
        pageInfo: {
          hasPreviousPage: false,
          hasNextPage: false,
          startCursor: cursor0,
          endCursor: cursor0
        },
        edges: [
          {
            cursor: cursor0,
            node: {
              id: toGlobalId('Post', 2),
              body: 'Check out this cool new GraphQL library, Join Monster.',
              comments: {
                pageInfo: {
                  hasNextPage: true
                },
                edges: [
                  {
                    node: {
                      id: toGlobalId('Comment', 4),
                      body: 'Do not forget to check out the demo.'
                    }
                  },
                  {
                    node: {
                      id: toGlobalId('Comment', 5),
                      body: 'This sucks. Go use REST you scrub.'
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
  t.deepEqual(expect, data)
})

test('should handle a post without an author', async t => {
  const query = `{
    node(id: "${toGlobalId('Post', 4)}") {
      id
      ... on Post {
        body
        author {
          id
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    node: {
      id: toGlobalId('Post', 4),
      body: 'I have no valid author...',
      author: null
    }
  }
  t.deepEqual(expect, data)
})

test('should pass context to getNode resolver', async t => {
  const query = `{
    node(id: "${toGlobalId('ContextPost', 1)}") {
      ... on ContextPost { body }
    }
  }`

  const { data, errors } = await run(query, null, { table: 'posts' })
  errCheck(t, errors)
  const expect = {
    node: {
      body: 'If I could marry a programming language, it would be Haskell.'
    }
  }
  t.deepEqual(expect, data)
})

test('should handle fragments recursively', async t => {
  const query = `
    {
      user(id: 1) {
        fullName
        comments(first: 2, after: "YXJyYXljb25uZWN0aW9uOjA=") {
          ... on CommentConnection {
            ...commentInfo
          }
        }
      }
    }

    fragment commentInfo on CommentConnection {
      ...commentInfo2
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }

    fragment commentInfo2 on CommentConnection {
      edges {
        ...commentInfo3
      }
    }

    fragment commentInfo3 on CommentEdge {
      node {
        id
        body
        author {
          ...userInfo
        }
      }
    }

    fragment userInfo on User {
      fullName
    }
  `
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'andrew carlson',
      comments: {
        edges: [
          {
            node: {
              id: 'Q29tbWVudDo0',
              body: 'Do not forget to check out the demo.',
              author: {
                fullName: 'andrew carlson'
              }
            }
          },
          {
            node: {
              id: 'Q29tbWVudDo2',
              body: 'Also, submit a PR if you have a feature you want to add.',
              author: {
                fullName: 'andrew carlson'
              }
            }
          }
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false
        }
      }
    }
  }
  t.deepEqual(expect, data)
})
