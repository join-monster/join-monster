import test from 'ava'
import { graphql } from 'graphql'
import schemaRelay from '../../example/schema-relay-paginate/index'
import { partial } from 'lodash'
import { offsetToCursor, toGlobalId } from 'graphql-relay'

// monkey-patch the array prototype because these are tests and IDGAF
Object.defineProperty(Array.prototype, 'last', {
  value: function() {
    return this[this.length - 1]
  },
  enumberable: false
})

const run = partial(graphql, schemaRelay)

function stringifyArgs(args) {
  if (!args) {
    return ''
  }
  const argArr = []
  for (let name in args) {
    argArr.push(`${name}: ${JSON.stringify(args[name])}`)
  }
  return `(${argArr.join(', ')})`
}

const pageInfo = 'pageInfo { hasNextPage, startCursor, endCursor }'

function makeUsersQuery(args) {
  let argString = stringifyArgs(args)
  if (args) {
    const argArr = []
    for (let name in args) {
      argArr.push(`${name}: ${JSON.stringify(args[name])}`)
    }
    argString = `(${argArr.join(', ')})`
  }
  return `{
    users${argString} {
      ${pageInfo}
      edges {
        cursor
        node { id, fullName, email }
      }
    }
  }`
}

test('should handle pagination at the root', async t => {
  const query = makeUsersQuery()
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: false,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(4)
  })
  t.deepEqual(data.users.edges[0], {
    cursor: offsetToCursor(0),
    node: {
      id: toGlobalId('User', 1),
      fullName: 'Alivia Waelchi',
      email: 'Mohammed.Hayes@hotmail.com'
    }
  })
  t.is(data.users.edges.last().cursor, data.users.pageInfo.endCursor)
})

test('should handle root pagination with "first" arg', async t => {
  const query = makeUsersQuery({ first: 2 })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: true,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(1)
  }, 'page info is accurate')
  t.deepEqual(data.users.edges[0], {
    cursor: offsetToCursor(0),
    node: {
      id: toGlobalId('User', 1),
      fullName: 'Alivia Waelchi',
      email: 'Mohammed.Hayes@hotmail.com'
    }
  }, 'the first node is accurate')
  t.is(data.users.edges.last().cursor, data.users.pageInfo.endCursor, 'the last cursor in edges matches the end cursor in page info')
})

test('should handle root pagination with "first" and "after" args', async t => {
  const query = makeUsersQuery({ first: 2, after: offsetToCursor(1) })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: true,
    startCursor: offsetToCursor(2),
    endCursor: offsetToCursor(3)
  }, 'page info is accurate')
  t.deepEqual(data.users.edges[0], {
    cursor: offsetToCursor(2),
    node: {
      id: toGlobalId('User', 3),
      fullName: 'Coleman Abernathy',
      email: 'Lurline79@gmail.com'
    }
  }, 'the first node is accurate')
  t.is(data.users.edges.last().cursor, data.users.pageInfo.endCursor, 'the last cursor in edges matches the end cursor in page info')
})

test('should handle the last page of root pagination', async t => {
  const query = makeUsersQuery({ first: 2, after: offsetToCursor(3) })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: false,
    startCursor: offsetToCursor(4),
    endCursor: offsetToCursor(4)
  }, 'page info is accurate')
  t.is(data.users.edges.length, 1)
  t.deepEqual(data.users.edges[0], {
    cursor: offsetToCursor(4),
    node: {
      id: toGlobalId('User', 5),
      fullName: 'Ocie Ruecker',
      email: 'Wayne85@gmail.com'
    }
  }, 'the first node is accurate')
  t.is(data.users.edges.last().cursor, data.users.pageInfo.endCursor, 'the last cursor in edges matches the end cursor in page info')
})

test('should return nothing after the end of root pagination', async t => {
  const query = makeUsersQuery({ first: 3, after: offsetToCursor(4) })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users, {
    pageInfo: {
      hasNextPage: false,
      startCursor: null,
      endCursor: null
    },
    edges: []
  })
})


function makePostsQuery(args) {
  let argString = stringifyArgs(args)
  return `{
    user(id: 1) {
      posts${argString} {
        ${pageInfo}
        edges {
          cursor
          node { id, body }
        }
      }
    }
  }`
}

test('should handle pagination in a nested field', async t => {
  const query = makePostsQuery()
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const posts = data.user.posts
  t.deepEqual(posts.pageInfo, {
    hasNextPage: false,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(7)
  })
  t.is(posts.edges.length, 8)
  t.deepEqual(posts.edges[0], {
    cursor: offsetToCursor(0),
    node: {
      id: toGlobalId('Post', 2),
      body: 'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut. Deserunt nemo pariatur sed facere accusantium quis. Nobis aut voluptate inventore quidem explicabo.'
    }
  }, 'post number 2 happens to be first since this field\'s first sort column is created_at')
  t.is(posts.edges.last().cursor, posts.pageInfo.endCursor)
})

test('nested paging should handle "first" arg', async t => {
  const query = makePostsQuery({ first: 3 })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const posts = data.user.posts
  t.deepEqual(posts.pageInfo, {
    hasNextPage: true,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(2)
  })
  t.is(posts.edges.length, 3)
  t.is(posts.edges.last().cursor, posts.pageInfo.endCursor)
})

test('nested paging should handle "first" and "after" args that reaches the last page', async t => {
  const query = makePostsQuery({ first: 5, after: offsetToCursor(3) })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const posts = data.user.posts
  t.deepEqual(posts.pageInfo, {
    hasNextPage: false,
    startCursor: offsetToCursor(4),
    endCursor: offsetToCursor(7)
  })
  t.is(posts.edges.length, 4)
  t.is(posts.edges.last().cursor, posts.pageInfo.endCursor)
})

test('can handle nested pagination', async t => {
  const query = `{
    users(first: 2) {
      edges {
        node {
          fullName,
          posts(first: 2) {
            edges {
              node { body }
            }
          }
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.is(data.users.edges.length, 2)
  t.is(data.users.edges[0].node.fullName, 'Alivia Waelchi')
  t.is(data.users.edges[0].node.posts.edges.length, 2)
  t.is(data.users.edges[0].node.posts.edges[0].node.body, 'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut. Deserunt nemo pariatur sed facere accusantium quis. Nobis aut voluptate inventore quidem explicabo.')
})

test('can handle deeply nested pagination', async t => {
  const query = `{
    users(first: 1) {
      edges {
        node {
          posts(first: 2) {
            edges {
              node {
                comments(first: 3) {
                  pageInfo {
                    hasNextPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node { id, body }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`
  const { data, errors } = await run (query)
  t.is(errors, undefined)
  const comments = data.users.edges[0].node.posts.edges[0].node.comments
  t.deepEqual(comments.pageInfo, {
    hasNextPage: true,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(2)
  })
  t.is(comments.edges.length, 3)
  t.is(comments.edges.last().cursor, comments.pageInfo.endCursor)
})

