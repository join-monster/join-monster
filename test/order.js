// this file should have the same test cases as test/pagination/common/order-paging.js but without pagination

import test from 'ava'
import { graphql } from 'graphql'
import schema from '../test-api/schema-basic/index'
import { errCheck } from './_util'

function makeQuery(asc) {
  return `{
    user(id: 1) {
      posts {
        id
        comments(asc:${asc}) {
          id
        }
      }
      comments {
        id
      }
    }
  }`
}

test('it should handle nested ordering with both ASC', async t => {
  const source = makeQuery(true)
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    [{ id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }],
    data.user.posts[0].comments
  )
  t.deepEqual([{ id: 1 }, { id: 4 }, { id: 6 }, { id: 8 }], data.user.comments)
})

test('it should handle nested ordering with one ASC and one DESC', async t => {
  const source = makeQuery(false)
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    [{ id: 8 }, { id: 7 }, { id: 6 }, { id: 5 }, { id: 4 }],
    data.user.posts[0].comments
  )
  t.deepEqual([{ id: 1 }, { id: 4 }, { id: 6 }, { id: 8 }], data.user.comments)
})

test('it should handle many-to-many order columns on the main table', async t => {
  const source = `{
    user(id: 3) {
      fullName
      following(sortOnMain: true) {
        id
        fullName
      }
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 1,
          fullName: 'andrew carlson'
        },
        {
          id: 2,
          fullName: 'matt elder'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle many-to-many order raw computed column on the main table', async t => {
  const source = `{
    user(id: 3) {
      fullName
      following(sortOnMain: true, by: "numPosts") {
        id
        fullName
      }
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 2,
          fullName: 'matt elder'
        },
        {
          id: 1,
          fullName: 'andrew carlson'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle many-to-many order columns on the junction table', async t => {
  const source = `{
    user(id: 3) {
      fullName
      following(sortOnMain: false) {
        id
        fullName
      }
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 1,
          fullName: 'andrew carlson'
        },
        {
          id: 2,
          fullName: 'matt elder'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle many-to-many order raw computed column on the junction table', async t => {
  const source = `{
    user(id: 3) {
      fullName
      following(sortOnMain: false by: "intimacy") {
        id
        fullName
      }
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 2,
          fullName: 'matt elder'
        },
        {
          id: 1,
          fullName: 'andrew carlson'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('it should allow ordering by a non requested raw computed column', async t => {
  const source = `{
    users(by: "numPosts") {
      fullName
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    users: [
      {
        fullName: 'foo bar',
      },
      {
        fullName: 'andrew carlson',
      },
      {
        fullName: 'matt elder',
      },
    ],
  }
  t.deepEqual(expect, data)
})

test('it should allow ordering by a requested raw computed column', async t => {
  const source = `{
    users(by: "numPosts") {
      fullName
      numPosts
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    users: [
      {
        fullName: 'foo bar',
        numPosts: 0,
      },
      {
        fullName: 'andrew carlson',
        numPosts: 1,
      },
      {
        fullName: 'matt elder',
        numPosts: 2,
      },
    ]
  }
  t.deepEqual(expect, data)
})
