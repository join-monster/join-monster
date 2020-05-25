import test from 'ava'
import { graphql } from 'graphql'
import { toGlobalId } from 'graphql-relay'
import schemaBasic from '../test-api/schema-basic/index'
import { partial } from 'lodash'
import { errCheck } from './_util'

function wrap(query) {
  return `{
    users { ${query} }
  }`
}

const run = partial(graphql, schemaBasic)

test('get a field with the same name as the SQL column', async t => {
  const query = wrap('id')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data, {
    users: [{ id: 1 }, { id: 2 }, { id: 3 }]
  })
})

test('get a field with a different SQL column name and field name', async t => {
  const query = wrap('email')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data, {
    users: [
      { email: 'andrew@stem.is' },
      { email: 'matt@stem.is' },
      { email: 'foo@example.org' }
    ]
  })
})

test('get a field that has a resolver on top of the SQL column', async t => {
  const query = wrap('idEncoded')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data, {
    users: [{ idEncoded: 'MQ==' }, { idEncoded: 'Mg==' }, { idEncoded: 'Mw==' }]
  })
})

test('get a globalID field', async t => {
  const query = wrap('globalId')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data, {
    users: [
      { globalId: toGlobalId('User', 1) },
      { globalId: toGlobalId('User', 2) },
      { globalId: toGlobalId('User', 3) }
    ]
  })
})

test('get a field that depends on multiple sql columns', async t => {
  const query = wrap('fullName')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.deepEqual(data, {
    users: [
      { fullName: 'andrew carlson' },
      { fullName: 'matt elder' },
      { fullName: 'foo bar' }
    ]
  })
})

test('it should disambiguate two entities with identical fields', async t => {
  const query = wrap('numLegs')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    users: [
      { numLegs: 2 }, // andy
      { numLegs: 2 }, // matt
      { numLegs: 2 }
    ]
  }
  t.deepEqual(expect, data)
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
  errCheck(t, errors)
  const expect = {
    users: [{ id: 1 }, { id: 2 }, { id: 3 }]
  }
  t.deepEqual(expect, data)
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
  errCheck(t, errors)
  const expect = {
    users: [
      { fullName: 'andrew carlson' },
      { fullName: 'matt elder' },
      { fullName: 'foo bar' }
    ]
  }
  t.deepEqual(expect, data)
})

test('it should handle nested fragments', async t => {
  const query = `
    {
      users {
        ... on User {
          ...info
        }
      }
    }
    fragment info on User {
      id, fullName, email
    }
  `
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    users: [
      { id: 1, fullName: 'andrew carlson', email: 'andrew@stem.is' },
      { id: 2, fullName: 'matt elder', email: 'matt@stem.is' },
      { id: 3, fullName: 'foo bar', email: 'foo@example.org' }
    ]
  }
  t.deepEqual(expect, data)
})

test('it should handle named fragments on an interface', async t => {
  const query = `
    {
      sponsors {
        ...info
      }
      user(id: 1) {
        ...info
      }
    }

    fragment info on Person {
      fullName
      ... on User {
        email
      }
      ... on Sponsor {
        generation
      }
    }
  `
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    sponsors: [
      { fullName: 'erlich bachman', generation: 1 },
      { fullName: 'andrew bachman', generation: 1 },
      { fullName: 'erlich bachman', generation: 2 },
      { fullName: 'matt bachman', generation: 2 },
      { fullName: 'matt daemon', generation: 1 }
    ],
    user: { fullName: 'andrew carlson', email: 'andrew@stem.is' }
  }
  t.deepEqual(expect, data)
})

test('it should handle inline fragments on an interface', async t => {
  const query = `
    {
      sponsors {
        ...on Person {
          fullName
          ... on User {
            email
          }
          ... on Sponsor {
            generation
          }
        }
      }
      user(id: 1) {
        ...on Person {
          fullName
          ... on User {
            email
          }
          ... on Sponsor {
            generation
          }
        }
      }
    }
  `
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    sponsors: [
      { fullName: 'erlich bachman', generation: 1 },
      { fullName: 'andrew bachman', generation: 1 },
      { fullName: 'erlich bachman', generation: 2 },
      { fullName: 'matt bachman', generation: 2 },
      { fullName: 'matt daemon', generation: 1 }
    ],
    user: { fullName: 'andrew carlson', email: 'andrew@stem.is' }
  }
  t.deepEqual(expect, data)
})

test('it should handle a column that resolves independantly of SQL', async t => {
  const query = wrap('id, favNums')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    users: [
      { id: 1, favNums: [1, 2, 3] },
      { id: 2, favNums: [1, 2, 3] },
      { id: 3, favNums: [1, 2, 3] }
    ]
  }
  t.deepEqual(expect, data)
})

test('it should handle a query that gets nothing from the database', async t => {
  const query = `{
    user(id:2) {
      favNums
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: { favNums: [1, 2, 3] }
  }
  t.deepEqual(expect, data)
})

test('it should handle duplicate fields', async t => {
  const query = wrap('id id id id idEncoded fullName fullName')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    users: [
      { id: 1, idEncoded: 'MQ==', fullName: 'andrew carlson' },
      { id: 2, idEncoded: 'Mg==', fullName: 'matt elder' },
      { id: 3, idEncoded: 'Mw==', fullName: 'foo bar' }
    ]
  }
  t.deepEqual(expect, data)
})

test('it should not be tripped up by the introspection queries', async t => {
  const query = wrap('__typename')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    users: [
      { __typename: 'User' },
      { __typename: 'User' },
      { __typename: 'User' }
    ]
  }
  t.deepEqual(expect, data)
})

test('it should handle numeric variables', async t => {
  const query = `
    query user($userId: Int) {
      user(id: $userId) {
        id
        fullName
      }
    }
  `
  const variables = { userId: 1 }
  const { data, errors } = await graphql(
    schemaBasic,
    query,
    null,
    null,
    variables
  )
  errCheck(t, errors)
  const expect = {
    user: {
      id: 1,
      fullName: 'andrew carlson'
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle string variables', async t => {
  const query = `
    query user($encodedUserId: String) {
      user(idEncoded: $encodedUserId) {
        idEncoded
        fullName
      }
    }
  `
  const variables = { encodedUserId: 'MQ==' }
  const { data, errors } = await graphql(
    schemaBasic,
    query,
    null,
    null,
    variables
  )
  errCheck(t, errors)
  const expect = {
    user: {
      idEncoded: 'MQ==',
      fullName: 'andrew carlson'
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle boolean variables', async t => {
  const query = `
    query sponsors($filter: Boolean) {
      sponsors(filterLegless: $filter) {
        numLegs
      }
    }
  `
  const variables = { filter: true }
  const { data, errors } = await graphql(
    schemaBasic,
    query,
    null,
    null,
    variables
  )
  errCheck(t, errors)
  const expect = {
    sponsors: []
  }
  t.deepEqual(expect, data)
})

test('it should handle raw SQL expressions', async t => {
  const query = `{
    user(id: 2) {
      fullName
      capitalizedLastName
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  t.is(
    data.user.fullName.split(' ')[1].toUpperCase(),
    data.user.capitalizedLastName
  )
})
