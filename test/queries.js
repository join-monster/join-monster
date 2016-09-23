import test from 'ava'
import { graphql } from 'graphql'
import { toGlobalId } from 'graphql-relay'
import schema from '../example/schema/index'
import { partial } from 'lodash'

function wrap(query) {
  return `{
    users {
      ${query}
    }
  }`
}

const run = partial(graphql, schema)

test('get a field with the same name as the SQL column', async t => {
  const query = wrap('id')
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data, {
    users: [
      { id: 1 },
      { id: 2 }
    ]
  })
})

test('get a field with a different SQL column name and field name', async t => {
  const query = wrap('email')
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data, {
    users: [
      { email: 'andrew@stem.is' },
      { email: 'matt@stem.is' }
    ]
  })
})

test('get a field that has a resolver on top of the SQL column', async t => {
  const query = wrap('idEncoded')
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data, {
    users: [
      { idEncoded: 'MQ==' },
      { idEncoded: 'Mg==' }
    ]
  })
})

test('get a globalID field', async t => {
  const query = wrap('globalId')
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data, {
    users: [
      { globalId: toGlobalId('User', 1) },
      { globalId: toGlobalId('User', 2) }
    ]
  })
})

test('get a field that depends on multiple sql columns', async t => {
  const query = wrap('full_name')
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data, {
    users: [
      { full_name: 'andrew carlson' },
      { full_name: 'matt elder' }
    ]
  })
})

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
      author { full_name }
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
            author: {
              full_name: 'andrew carlson'
            }
          }
        ]
      },
      {
        comments: []
      }
    ]
  }
  t.deepEqual(data, expect)
})

test('should handle joins with the same table name', async t => {
  const query = wrap(`
    idEncoded
    globalId
    email
    full_name
    comments {
      id
      body
      author {
        full_name
      }
      post {
        id
        body
        author {
          full_name
        }
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
        full_name: 'andrew carlson',
        comments: [
          {
            id: 1,
            body: 'Wow this is a great post, Matt.',
            author: {
              full_name: 'andrew carlson'
            },
            post: {
              id: 1,
              body: 'If I could marry a programming language, it would be Haskell.',
              author: {
                full_name: 'matt elder'
              }
            }
          }
        ]
      },
      {
        idEncoded: 'Mg==',
        globalId: 'VXNlcjoy',
        email: 'matt@stem.is',
        full_name: 'matt elder',
        comments: []
      }
    ]
  }
  t.deepEqual(data, expect)
})

test('it should handle many to many relationship', async t => {
  const query = wrap(`
    full_name
    following {
      full_name
    }
  `)
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      {
        full_name: 'andrew carlson',
        following: [
          {
            full_name: 'matt elder'
          }
        ]
      },
      {
        full_name: 'matt elder',
        following: []
      }
    ]
  }
  t.deepEqual(data, expect)
})

test('it should handle a where condition', async t => {
  const query = `{
    user(id: 1) {
      full_name
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    user: {
      full_name: 'andrew carlson'
    }
  }
  t.deepEqual(data, expect)
})
