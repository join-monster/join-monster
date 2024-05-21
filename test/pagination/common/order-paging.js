// this file should have the same test cases as test/order.js but with pagination
// will be run for both keyset and offset pagination

import test from 'ava'
import { graphql } from 'graphql'
import schema from '../../../test-api/schema-paginated/index'
import { errCheck } from '../../_util'
import { offsetToCursor, toGlobalId } from 'graphql-relay'
import { objToCursor } from '../../../src/util'

function makeQuery(asc) {
  return `{
    user(id: 1) {
      posts {
        edges {
          node {
            id
            comments(asc:${asc}) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
      comments {
        edges {
          node {
            id
          }
        }
      }
    }
  }`
}

test('it should handle nested ordering with both ASC', async t => {
  const source = makeQuery(true)
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    [{ id: toGlobalId('Comment', 18) }, { id: toGlobalId('Comment', 116) }, { id: toGlobalId('Comment', 227) }, { id: toGlobalId('Comment', 233) }],
    data.user.posts.edges[0].node.comments.edges.map(({ node }) => node)
  )
  t.deepEqual([{ id: toGlobalId('Comment', 1) }, { id: toGlobalId('Comment', 3) }], data.user.comments.edges.map(({ node }) => node))
})

test('it should handle nested ordering with one ASC and one DESC', async t => {
  const source = makeQuery(false)
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    [{ id: toGlobalId('Comment', 233) }, { id: toGlobalId('Comment', 227) }, { id: toGlobalId('Comment', 116) }, { id: toGlobalId('Comment', 18) }],
    data.user.posts.edges[0].node.comments.edges.map(({ node }) => node)
  )
  t.deepEqual([{ id: toGlobalId('Comment', 1) }, { id: toGlobalId('Comment', 3) }], data.user.comments.edges.map(({ node }) => node))
})

test('should handle many-to-many order columns on the main table', async t => {
  const cursor = process.env.PAGINATE === 'keyset' ? objToCursor({
    created_at: '2015-10-19T05:48:04.537Z',
    id: 3
  }) : offsetToCursor(0)

  const source  = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: true, after: "${cursor}") {
        edges {
          node {
            id
            fullName
          }
        }
      }
    }
  }`
  const { data, errors } = await graphql({schema, source})
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

test('it should handle many-to-many order raw computed column on the main table', async t => {
  const cursor = process.env.PAGINATE === 'keyset' ? objToCursor({
    numPosts: 8,
    id: 3
  }) : offsetToCursor(2)

  const source  = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: true, by: "numPosts" after: "${cursor}") {
        edges {
          node {
            id
            fullName
          }
        }
      }
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'Hudson Hyatt',
      following: {
        edges: [
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

test('should handle many-to-many order columns on the junction table', async t => {
  const cursor = process.env.PAGINATE === 'keyset' ? objToCursor({
    created_at: '2016-01-01T16:28:00.051Z',
    followee_id: 1
  }) : offsetToCursor(0)

  const source  = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: false, after: "${cursor}") {
        edges {
          node {
            id
            fullName
          }
        }
      }
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'Hudson Hyatt',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 3),
              fullName: 'Coleman Abernathy'
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

test('it should handle many-to-many order raw computed column on the junction table', async t => {
  const cursor = process.env.PAGINATE === 'keyset' ? objToCursor({
    intimacy: 'acquaintance',
    followee_id: 1
  }) : offsetToCursor(0)

  const source  = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: false, by: "intimacy" after: "${cursor}") {
        edges {
          node {
            id
            fullName
          }
        }
      }
    }
  }`
  const { data, errors } = await graphql({schema, source})
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
