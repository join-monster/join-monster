import test from 'ava'
import { graphql } from 'graphql'
import schemaRelay from '../../example/schema-relay-paginate-2/index'
import { partial } from 'lodash'
import { toGlobalId } from 'graphql-relay'
import { objToCursor } from '../../src/util'

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

const pageInfo = 'pageInfo { hasNextPage, hasPreviousPage, startCursor, endCursor }'

function makeUsersQuery(args) {
  let argString = stringifyArgs(args)
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
    hasPreviousPage: false,
    startCursor: objToCursor({ id: 1 }),
    endCursor: objToCursor({ id: 5 })
  })
  // generate globalIds for users 1 thru 5
  const ids = Array.apply(null, Array(5)).map((_, i) => toGlobalId('User', i + 1))
  t.deepEqual(data.users.edges.map(edge => edge.node.id), ids)
  t.is(data.users.edges.last().cursor, data.users.pageInfo.endCursor)
})

test('should handle root pagination with "first" arg', async t => {
  const query = makeUsersQuery({ first: 2 })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: objToCursor({ id: 1 }),
    endCursor: objToCursor({ id: 2 })
  }, 'page info is accurate')
  t.deepEqual(data.users.edges[0], {
    cursor: objToCursor({ id: 1 }),
    node: {
      id: toGlobalId('User', 1),
      fullName: 'Alivia Waelchi',
      email: 'Mohammed.Hayes@hotmail.com'
    }
  }, 'the first node is accurate')
  t.is(data.users.edges.last().cursor, data.users.pageInfo.endCursor, 'the last cursor in edges matches the end cursor in page info')
})

test('should handle root pagination with "first" and "after" args', async t => {
  const query = makeUsersQuery({ first: 2, after: objToCursor({ id: 2 }) })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: objToCursor({ id: 3 }),
    endCursor: objToCursor({ id: 4 })
  }, 'page info is accurate')
  t.deepEqual(data.users.edges[0], {
    cursor: objToCursor({ id: 3 }),
    node: {
      id: toGlobalId('User', 3),
      fullName: 'Coleman Abernathy',
      email: 'Lurline79@gmail.com'
    }
  }, 'the first node is accurate')
  t.is(data.users.edges.last().cursor, data.users.pageInfo.endCursor, 'the last cursor in edges matches the end cursor in page info')
})

test('should handle the last page of root pagination', async t => {
  const query = makeUsersQuery({ first: 2, after: objToCursor({ id: 4 }) })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: objToCursor({ id: 5 }),
    endCursor: objToCursor({ id: 5 })
  }, 'page info is accurate')
  t.is(data.users.edges.length, 1)
  t.deepEqual(data.users.edges[0], {
    cursor: objToCursor({ id: 5 }),
    node: {
      id: toGlobalId('User', 5),
      fullName: 'Ocie Ruecker',
      email: 'Wayne85@gmail.com'
    }
  }, 'the first node is accurate')
  t.is(data.users.edges.last().cursor, data.users.pageInfo.endCursor, 'the last cursor in edges matches the end cursor in page info')
})

test('should return nothing after the end of root pagination', async t => {
  const query = makeUsersQuery({ first: 3, after: objToCursor({ id: 5 }) })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users, {
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null
    },
    edges: []
  })
})

test('should handle backward pagination at root with "last" arg', async t => {
  const query = makeUsersQuery({ last: 2 })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: false,
    hasPreviousPage: true,
    startCursor: objToCursor({ id: 4 }),
    endCursor: objToCursor({ id: 5 })
  })
  t.is(data.users.edges[0].node.id, toGlobalId('User', 4))
  t.is(data.users.edges[1].node.id, toGlobalId('User', 5))
})

test('should handle backward pagination at root with "last" and "before" args', async t => {
  const query = makeUsersQuery({ last: 1, before: objToCursor({ id: 2 }) })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: objToCursor({ id: 1 }),
    endCursor: objToCursor({ id: 1 })
  })
  t.is(data.users.edges.length, 1)
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
    hasPreviousPage: false,
    startCursor: objToCursor({ created_at: '2016-04-17T18:49:15.942Z', id: 2 }),
    endCursor: objToCursor({ created_at: '2015-11-15T08:26:11.331Z', id: 30 })
  })
  t.is(posts.edges.length, 8)
  t.deepEqual(posts.edges[0], {
    cursor: objToCursor({ created_at: '2016-04-17T18:49:15.942Z', id: 2 }),
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
    hasPreviousPage: false,
    startCursor: objToCursor({ created_at: '2016-04-17T18:49:15.942Z', id: 2 }),
    endCursor: objToCursor({ created_at: '2016-04-13T15:07:15.119Z', id: 33 })
  })
  t.is(posts.edges.length, 3)
  t.is(posts.edges.last().cursor, posts.pageInfo.endCursor)
})

test('nested paging should handle "last" and "before" args', async t => {
  const query = makePostsQuery({ last: 2, before: objToCursor({ created_at: '2016-04-13T15:07:15.119Z', id: 33 }) })
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: objToCursor({ created_at: '2016-04-17T18:49:15.942Z', id: 2 }),
    endCursor: objToCursor({ created_at: '2016-04-15T03:29:31.212Z', id: 28 })
  }
  t.deepEqual(data.user.posts.pageInfo, expect)
  t.is(data.user.posts.edges[0].node.id, toGlobalId('Post', 2))
  t.is(data.user.posts.edges[1].node.id, toGlobalId('Post', 28))
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
                    node {
                      id,
                      body
                      author { fullName }
                    }
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
  const expect = {
    hasNextPage: true,
    startCursor: objToCursor({ id: 233 }),
    endCursor: objToCursor({ id: 116 })
  }
  t.deepEqual(comments.pageInfo, expect)
  t.is(comments.edges.length, 3)
  t.deepEqual(comments.edges[0], {
    cursor: objToCursor({ id: 233 }),
    node: {
      id: toGlobalId('Comment', 233),
      body: 'I\'ll reboot the digital SCSI system, that should bus the USB protocol!',
      author: {
        fullName: 'Coleman Abernathy'
      }
    }
  })
  t.is(comments.edges.last().cursor, comments.pageInfo.endCursor)
})

test('handle a conection type with a many-to-many', async t => {
  const query = `{
    user(id: 2) {
      following(first: 2, after: "${objToCursor({ created_at: '2016-01-01T16:28:00.051Z', followee_id: 1 })}") {
        pageInfo {
          hasNextPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            fullName
          }
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data.user.following.pageInfo, {
    hasNextPage: true,
    startCursor: objToCursor({ created_at: '2016-05-18T21:35:54.601Z', followee_id: 3 }),
    endCursor: objToCursor({ created_at: '2016-06-15T08:56:18.519Z', followee_id: 2 })
  })
  t.deepEqual(data.user.following.edges, [
    { node: { id: toGlobalId('User', 3), fullName: 'Coleman Abernathy' } },
    { node: { id: toGlobalId('User', 2), fullName: 'Hudson Hyatt' } }
  ])
})

test('should handle pagination with duplicate objects', async t => {
  const user1Id = toGlobalId('User', 1)
  // notice the cyclical nature of this query. we get a user. then we get their posts. the we get the author, who is that same user
  // we need to make sure join monster references the same object instead of cloning it
  const query = `{
    node(id: "${user1Id}") {
      ... on User {
        ...info
        posts(first: 3) {
          edges {
            node {
              body
              author {
                ...info
              }
            }
          }
        }
      }
    }
  }
  fragment info on User {
    id
    fullName
    email
    following {
      edges {
        node {
          id
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const following = {
    edges: [
      { node: { id: toGlobalId('User', 4) } }
    ]
  }
  // this object gets duplicated in the result 4 times!
  const user1 = {
    id: user1Id,
    fullName: 'Alivia Waelchi',
    email: 'Mohammed.Hayes@hotmail.com',
    following,
  }
  const expect = {
    node: {
      ...user1,
      posts: {
        edges: [
          {
            node: {
              body: 'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut. Deserunt nemo pariatur sed facere accusantium quis. Nobis aut voluptate inventore quidem explicabo.',
              author: user1
            }
          },
          {
            node: {
              body: 'Eum iure laudantium officia doloremque et ut fugit ut. Magni eveniet ipsa.',
              author: user1
            }
          },
          {
            node: {
              body: 'Incidunt quibusdam nulla adipisci error quia. Consequatur consequatur soluta fugit dolor iure. Voluptas accusamus fugiat assumenda enim.',
              author: user1
            }
          }
        ]
      }
    }
  }
  t.deepEqual(data, expect)
})


