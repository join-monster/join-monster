import test from 'ava'
import { graphql } from 'graphql'
import { toGlobalId } from 'graphql-relay'
import schema from '../example/schema/index'
import { partial } from 'lodash'

function wrap(query) {
  return `{
    users { ${query} }
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
  const query = wrap('fullName')
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  t.deepEqual(data, {
    users: [
      { fullName: 'andrew carlson' },
      { fullName: 'matt elder' }
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

test('it should handle a where condition', async t => {
  const query = `{
    user(id: 1) {
      fullName
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    user: { fullName: 'andrew carlson' }
  }
  t.deepEqual(data, expect)
})

test('it should disambiguate two entities with identical fields', async t => {
  const query = wrap('numLegs')
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      { numLegs: 2 }, // andy
      { numLegs: 2 }  // matt
    ]
  }
  t.deepEqual(data, expect)
})

test('it should handle fragments at the top level', async t => {
  const query = `
    {
      users {
        ...F0
      }
    }
    fragment F0 on User { id }
  `
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      { id: 1 },
      { id: 2 }
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

test('it should handle an inline fragment', async t => {
  const query = `
    {
      users {
        ... on User { fullName }
      }
    }
  `
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      { fullName: 'andrew carlson' },
      { fullName: 'matt elder' }
    ]
  }
  t.deepEqual(data, expect)
})

test('it should handle a column that resolves independantly of SQL', async t => {
  const query = wrap('id, favNums')
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    users: [
      { id: 1, favNums: [1, 2, 3] },
      { id: 2, favNums: [1, 2, 3] }
    ]
  }
  t.deepEqual(data, expect)
})

test('it should handle a query that gets nothing from the database', async t => {
  const query = `{
    user(id:2) {
      favNums
    }
  }`
  const { data, errors } = await run(query)
  t.is(errors, undefined)
  const expect = {
    user: { favNums: [1, 2, 3] }
  }
  t.deepEqual(data, expect)
})

