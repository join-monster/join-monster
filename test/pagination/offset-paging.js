import test from 'ava'
import { graphql } from 'graphql'
import schemaRelay from '../../test-api/schema-paginated/index'
import { partial } from 'lodash'
import { offsetToCursor, toGlobalId, fromGlobalId } from 'graphql-relay'
import { errCheck } from '../_util'

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
  return `{
    users${argString} {
      total
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
  errCheck(t, errors)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: false,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(5)
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
  errCheck(t, errors)
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
  t.is(
    data.users.edges.last().cursor,
    data.users.pageInfo.endCursor,
    'the last cursor in edges matches the end cursor in page info'
  )
})

test('should handle root pagination with "first" and "after" args', async t => {
  const query = makeUsersQuery({ first: 2, after: offsetToCursor(1) })
  const { data, errors } = await run(query)
  errCheck(t, errors)
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
  t.is(
    data.users.edges.last().cursor,
    data.users.pageInfo.endCursor,
    'the last cursor in edges matches the end cursor in page info'
  )
})

test('should handle the last page of root pagination', async t => {
  const query = makeUsersQuery({ first: 2, after: offsetToCursor(4) })
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data.users.pageInfo, {
    hasNextPage: false,
    startCursor: offsetToCursor(5),
    endCursor: offsetToCursor(5)
  }, 'page info is accurate')
  t.is(data.users.edges.length, 1)
  t.deepEqual(data.users.edges[0], {
    cursor: offsetToCursor(5),
    node: {
      id: toGlobalId('User', 6),
      fullName: 'Andrew Carlson',
      email: 'andrew@stem.is'
    }
  }, 'the first node is accurate')
  t.is(
    data.users.edges.last().cursor,
    data.users.pageInfo.endCursor,
    'the last cursor in edges matches the end cursor in page info'
  )
})

test('should return nothing after the end of root pagination', async t => {
  const query = makeUsersQuery({ first: 3, after: offsetToCursor(5) })
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data.users, {
    total: 0,
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
        total
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
  errCheck(t, errors)
  const posts = data.user.posts
  t.is(posts.total, 8)
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
      body: [
        'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
        'Deserunt nemo pariatur sed facere accusantium quis.',
        'Nobis aut voluptate inventore quidem explicabo.'
      ].join(' ')
    }
  }, 'post number 2 happens to be first since this field\'s first sort column is created_at')
  t.is(posts.edges.last().cursor, posts.pageInfo.endCursor)
})

test('nested paging should handle "first" arg', async t => {
  const query = makePostsQuery({ first: 3 })
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const posts = data.user.posts
  t.is(posts.total, 8)
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
  errCheck(t, errors)
  const posts = data.user.posts
  t.is(posts.total, 8)
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
            total
            edges {
              node { body }
            }
          }
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  t.deepEqual(data.users.edges.map(edge => edge.node.posts.total), [ 8, 13 ])
  errCheck(t, errors)
  t.is(data.users.edges.length, 2)
  t.is(data.users.edges[0].node.fullName, 'Alivia Waelchi')
  t.is(data.users.edges[0].node.posts.edges.length, 2)
  t.is(
    data.users.edges[0].node.posts.edges[0].node.body,
    [
      'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
      'Deserunt nemo pariatur sed facere accusantium quis.',
      'Nobis aut voluptate inventore quidem explicabo.'
    ].join(' ')
  )
})

test('can go to each second page in a nested connection', async t => {
  const query = `{
    users(first: 2) {
      edges {
        node {
          id
          fullName
          posts(first: 2, after: "${offsetToCursor(1)}") {
            edges {
              cursor
              node { id, body }
            }
          }
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.is(data.users.edges[0].node.id, toGlobalId('User', 1))
  t.deepEqual(
    data.users.edges[0].node.posts.edges.map(edge => edge.node.id),
    [ toGlobalId('Post', 33), toGlobalId('Post', 38) ]
  )
  t.is(data.users.edges[1].node.id, toGlobalId('User', 2))
  t.deepEqual(
    data.users.edges[1].node.posts.edges.map(edge => edge.node.id),
    [ toGlobalId('Post', 1), toGlobalId('Post', 50) ]
  )
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
                  total
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
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const comments = data.users.edges[0].node.posts.edges[0].node.comments
  t.deepEqual(comments.pageInfo, {
    hasNextPage: true,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(2)
  })
  t.is(comments.edges.length, 3)
  t.deepEqual(comments.edges[0], {
    cursor: offsetToCursor(0),
    node: {
      id: toGlobalId('Comment', 18),
      body: 'bypassing the hard drive won\'t do anything, we need to back up the primary EXE bandwidth!',
      author: {
        fullName: 'Coleman Abernathy'
      }
    }
  })
  t.is(comments.edges.last().cursor, comments.pageInfo.endCursor)
})

test('handle a connection type with a many-to-many', async t => {
  const query = `{
    user(id: 2) {
      following(first: 2, after:"${offsetToCursor(0)}") {
        pageInfo {
          hasNextPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            friendship
            intimacy
            closeness
            fullName
          }
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data.user.following.pageInfo, {
    hasNextPage: true,
    startCursor: offsetToCursor(1),
    endCursor: offsetToCursor(2)
  })
  t.deepEqual(data.user.following.edges, [
    {
      node: {
        id: toGlobalId('User', 2),
        fullName: 'Hudson Hyatt',
        friendship: 'acquaintance',
        intimacy: 'acquaintance',
        closeness: 'acquaintance'
      }
    },
    {
      node: {
        id: toGlobalId('User', 3),
        fullName: 'Coleman Abernathy',
        friendship: 'acquaintance',
        intimacy: 'acquaintance',
        closeness: 'acquaintance'
      }
    }
  ])
})

test('filtered pagination at the root', async t => {
  const query = `{
    users(search: "c%i") {
      edges {
        node {
          fullName
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data, {
    users: {
      edges: [
        {
          node: { fullName: 'Alivia Waelchi' }
        },
        {
          node: { fullName: 'Ocie Ruecker' }
        }
      ]
    }
  })
})

test('filtering on one-to-many-nested field', async t => {
  const query = `{
    user(id: 1) {
      posts(search: "ad") {
        edges {
          node {
            body
          }
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data.user.posts.edges, [
    {
      node: {
        body: [
          'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
          'Deserunt nemo pariatur sed facere accusantium quis.',
          'Nobis aut voluptate inventore quidem explicabo.'
        ].join(' ')
      }
    },
    {
      node: {
        body: [
          'Incidunt quibusdam nulla adipisci error quia.',
          'Consequatur consequatur soluta fugit dolor iure.',
          'Voluptas accusamus fugiat assumenda enim.'
        ].join(' ')
      }
    }
  ])
})

test('should handle emptiness', async t => {
  const query = `{
    user(id: 6) {
      following {
        edges {
          node {
            id
          }
        }
      }
      posts {
        edges {
          node {
            id
            comments {
              edges {
                node {
                  id
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
      following: {
        edges: []
      },
      posts: {
        edges: []
      }
    }
  }
  t.deepEqual(expect, data)
})

test('should handle a post without an author', async t => {
  const query = `{
    node(id: "${toGlobalId('Post', 19)}") {
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
      id: toGlobalId('Post', 19),
      body: 'Fugit error et. Unde in iure.',
      author: null
    }
  }
  t.deepEqual(expect, data)
})

test('should handle a "where" condition on a one-to-many paginated field', async t => {
  const query = `{
    users(first: 1) {
      edges {
        node {
          ...info
        }
      }
    }
  }

  fragment info on User {
    id
    fullName
    comments(first: 4, active: false, after: "${offsetToCursor(0)}") {
      total
      edges {
        node {
          id
          archived
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.is(data.users.edges.length, 1)
  t.is(data.users.edges[0].node.fullName, 'Alivia Waelchi')
  const comments = data.users.edges[0].node.comments.edges.map(edge => ({
    id: parseInt(fromGlobalId(edge.node.id).id, 10),
    archived: edge.node.archived
  }))
  t.is(data.users.edges[0].node.comments.total, 47)
  const expect = [
    {
      id: 3,
      archived: false
    },
    {
      id: 4,
      archived: false
    },
    {
      id: 12,
      archived: false
    },
    {
      id: 22,
      archived: false
    }
  ]
  t.deepEqual(expect, comments)
})

test('should handle "where" condition on main table of many-to-many relation', async t => {
  const query = `{
    user(id: 3) {
      fullName
      following(intimacy: acquaintance) {
        edges {
          node {
            id
            fullName
            intimacy
          }
        }
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'Coleman Abernathy',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 4),
              fullName: 'Lulu Bogisich',
              intimacy: 'acquaintance'
            }
          }
        ]
      }
    }
  }
  t.deepEqual(expect, data)
})

test('should handle order columns on the main table', async t => {
  const query = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: true, after: "${offsetToCursor(0)}") {
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
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'Hudson Hyatt',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 1),
              fullName: 'Alivia Waelchi'
            }
          },
          {
            node: {
              id: toGlobalId('User', 2),
              fullName: 'Hudson Hyatt'
            }
          }
        ]
      }
    }
  }
  t.deepEqual(expect, data)
})

test('should handle order columns on the junction table', async t => {
  const query = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: false, after: "${offsetToCursor(0)}") {
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
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'Hudson Hyatt',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 2),
              fullName: 'Hudson Hyatt'
            }
          },
          {
            node: {
              id: toGlobalId('User', 3),
              fullName: 'Coleman Abernathy'
            }
          }
        ]
      }
    }
  }
  t.deepEqual(expect, data)
})

test('should handle an interface type', async t => {
  const query = `{
    user(id: 1) {
      writtenMaterial(first: 3) {
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
    pageInfo: {
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: 'YXJyYXljb25uZWN0aW9uOjA=',
      endCursor: 'YXJyYXljb25uZWN0aW9uOjI='
    },
    edges: [
      {
        node: {
          id: 'Q29tbWVudDox',
          body: 'Try to input the RSS circuit, maybe it will copy the auxiliary sensor!'
        }
      },
      {
        node: {
          id: 'UG9zdDoy',
          body: [
            'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
            'Deserunt nemo pariatur sed facere accusantium quis.',
            'Nobis aut voluptate inventore quidem explicabo.'
          ].join(' ')
        }
      },
      {
        node: {
          id: 'UG9zdDoz',
          body: [
            'Qui provident saepe laborum non est. Eaque aut enim officiis deserunt.',
            'Est sed suscipit praesentium et similique repudiandae.',
            'Inventore similique commodi non dolores inventore dolor est aperiam.'
          ].join(' ')
        }
      }
    ]
  }
  t.deepEqual(expect, data.user.writtenMaterial)
})
