import test from 'ava'
import { graphql } from 'graphql'
import schemaBasic from '../example/schema-basic/index'
import { partial } from 'lodash'

function wrap(query) {
  return `{
    users { ${query} }
  }`
}

const run = partial(graphql, schemaBasic)

test('should join a one-to-many relation', async t => {
  const query = wrap('id, comments { id, body }')
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      {
        id: 1,
        comments: [
          {
            id: 1,
            body: 'Wow this is a great post, Matt.'
          }
        ]
      },
      {
        id: 2,
        comments: []
      }
    ]
  }
  t.deepEqual(data, expect)
})

test('should join on a nested relation', async t => {
  const query = wrap(`
    comments {
      id
      body
      author { fullName }
    }
  `)
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      {
        comments: [
          {
            id: 1,
            body: 'Wow this is a great post, Matt.',
            author: { fullName: 'andrew carlson' }
          }
        ]
      },
      { comments: [] }
    ]
  }
  t.deepEqual(data, expect)
})

test('should handle joins with the same table name', async t => {
  const query = wrap(`
    idEncoded
    globalId
    email
    fullName
    comments {
      id
      body
      author { fullName }
      post {
        id
        body
        author { fullName }
      }
    }
  `)
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      {
        idEncoded: 'MQ==',
        globalId: 'VXNlcjox',
        email: 'andrew@stem.is',
        fullName: 'andrew carlson',
        comments: [
          {
            id: 1,
            body: 'Wow this is a great post, Matt.',
            author: { fullName: 'andrew carlson' },
            post: {
              id: 1,
              body: 'If I could marry a programming language, it would be Haskell.',
              author: { fullName: 'matt elder' }
            }
          }
        ]
      },
      {
        idEncoded: 'Mg==',
        globalId: 'VXNlcjoy',
        email: 'matt@stem.is',
        fullName: 'matt elder',
        comments: []
      }
    ]
  }
  t.deepEqual(data, expect)
})

test('it should handle many to many relationship', async t => {
  const query = wrap(`
    fullName
    following { fullName }
  `)
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      {
        fullName: 'andrew carlson',
        following: [
          { fullName: 'matt elder' }
        ]
      },
      {
        fullName: 'matt elder',
        following: []
      }
    ]
  }
  t.deepEqual(data, expect)
})

test('it should handle fragments nested lower', async t => {
  const query = `
    {
      users {
        ...F0
        comments {
          ...F2
          ...F3
          post { ...F1 }
        }
      }
    }
    fragment F0 on User { id }
    fragment F1 on Post { body }
    fragment F2 on Comment { id }
    fragment F3 on Comment { body }
  `
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      {
        id: 1,
        comments: [
          {
            id: 1,
            body: 'Wow this is a great post, Matt.',
            post: {
              body: 'If I could marry a programming language, it would be Haskell.'
            }
          }
        ]
      },
      {
        id: 2,
        comments: []
      }
    ]
  }
  t.deepEqual(data, expect)
})

