import test from 'ava'
import { graphql } from 'graphql'
import schema from '../test-api/schema-basic'
import { errCheck } from './_util'

test('it should resolve aliases on different nesting levels', async (t) => {
  const source = `
    query {
      aliasedUser: user(id: 1) {
        aliasedFullName: fullName
        aliasedPosts: posts {
          aliasedId: id
          aliasedAuthor: author {
            aliasedFullName: fullName
          }
        }
        aliasedFollowing: following(name: "matt") {
          aliasedFullName: fullName
        }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)

  t.deepEqual(
    {
      aliasedFullName: 'andrew carlson',
      aliasedPosts: [
        {
          aliasedId: 2,
          aliasedAuthor: {
            aliasedFullName: 'andrew carlson',
          },
        },
      ],
      aliasedFollowing: [{ aliasedFullName: 'matt elder' }],
    },
    data.aliasedUser,
  )
})

test('it should allow an alias to the same relation (without args, same fields)', async (t) => {
  const source = `
    query {
      user(id: 3) {
        following1: following { fullName }
        following2: following { fullName }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      following1: [{ fullName: 'andrew carlson' }, { fullName: 'matt elder' }],
      following2: [{ fullName: 'andrew carlson' }, { fullName: 'matt elder' }],
    },
    data.user,
  )
})

test('it should handle different args nested within aliases to the same relation', async (t) => {
  const source = `
    query {
      user(id: 3) {
        following1: following {
          fullName
          comments {
            id
          }
        }
        following2: following {
          fullName
          comments(active: true) {
            id
          }
        }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      following1: [
        {
          fullName: 'andrew carlson',
          comments: [{ id: 1 }, { id: 4 }, { id: 6 }, { id: 8 }],
        },
        {
          fullName: 'matt elder',
          comments: [{ id: 7 }],
        },
      ],
      following2: [
        {
          fullName: 'andrew carlson',
          comments: [{ id: 1 }, { id: 4 }, { id: 6 }, { id: 8 }],
        },
        {
          fullName: 'matt elder',
          comments: [],
        },
      ],
    },
    data.user,
  )
})

test('it should allow an alias to the same relation (without args, different fields)', async (t) => {
  const source = `
    query {
      user(id: 3) {
        following1: following { id, fullName }
        following2: following { fullName }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      following1: [
        { id: 1, fullName: 'andrew carlson' },
        { id: 2, fullName: 'matt elder' },
      ],
      following2: [{ fullName: 'andrew carlson' }, { fullName: 'matt elder' }],
    },
    data.user,
  )
})

test('it should allow an alias to the same relation (one with args)', async (t) => {
  const source = `
    query {
      user(id: 3) {
        following { fullName }
        andrews: following(name: "andrew") { fullName }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      following: [{ fullName: 'andrew carlson' }, { fullName: 'matt elder' }],
      andrews: [{ fullName: 'andrew carlson' }],
    },
    data.user,
  )
})

test('it should allow an alias to the same relation (both with args)', async (t) => {
  const source = `
    query {
      user(id: 3) {
        following(name: "matt") { fullName }
        andrews: following(name: "andrew") { fullName }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      following: [{ fullName: 'matt elder' }],
      andrews: [{ fullName: 'andrew carlson' }],
    },
    data.user,
  )
})

test('it should allow multiple different aliases to the same relation (one with args)', async (t) => {
  const source = `
    query {
      user(id: 3) {
        follow: following { fullName }
        andrews: following(name: "andrew") { fullName }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      follow: [{ fullName: 'andrew carlson' }, { fullName: 'matt elder' }],
      andrews: [{ fullName: 'andrew carlson' }],
    },
    data.user,
  )
})

test('it should allow multiple different aliases to the same relation (both with args)', async (t) => {
  const source = `
    query {
      user(id: 3) {
        matts: following(name: "matt") { fullName }
        andrews: following(name: "andrew") { fullName }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      matts: [{ fullName: 'matt elder' }],
      andrews: [{ fullName: 'andrew carlson' }],
    },
    data.user,
  )
})

test('it should allow multiple different aliases to the same relation with args (via fragment)', async (t) => {
  const source = `
    fragment foo on User {
      matts: following(name: "matt") { fullName }
      andrews: following(name: "andrew") { fullName }
    }
    query {
      user(id: 3) {
        ...foo
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      matts: [{ fullName: 'matt elder' }],
      andrews: [{ fullName: 'andrew carlson' }],
    },
    data.user,
  )
})

test('it should allow multiple different aliases to the same relation with args (via inline fragment)', async (t) => {
  const source = `
    query {
      user(id: 3) {
        ... on User {
          matts: following(name: "matt") { fullName }
          andrews: following(name: "andrew") { fullName }
        }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      matts: [{ fullName: 'matt elder' }],
      andrews: [{ fullName: 'andrew carlson' }],
    },
    data.user,
  )
})

test('it should allow multiple different aliases on unions', async (t) => {
  const source = `
    query {
      user(id: 1) {
        libraryTexts: writtenMaterial1(search: "library") {
          __typename
          ... on Comment {
            id
            body
          }
          ... on Post {
            id
            body
          }
        }
        featureTexts: writtenMaterial1(search: "feature") {
          __typename
          ... on Comment {
            id
            body
          }
          ... on Post {
            id
            body
          }
        }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      libraryTexts: [
        {
          __typename: 'Post',
          id: 2,
          body: 'Check out this cool new GraphQL library, Join Monster.',
        },
        {
          __typename: 'Comment',
          id: 8,
          body: 'Somebody please help me with this library. It is so much work.',
        },
      ],
      featureTexts: [
        {
          __typename: 'Comment',
          id: 6,
          body: 'Also, submit a PR if you have a feature you want to add.',
        },
      ],
    },
    data.user,
  )
})

test('it should allow multiple different aliases on interfaces', async (t) => {
  const source = `
    query {
      user(id: 1) {
        libraryTexts: writtenMaterial2(search: "library") {
          __typename
          ... on Comment {
            id
            body
          }
          ... on Post {
            id
            body
          }
        }
        featureTexts: writtenMaterial2(search: "feature") {
          __typename
          ... on Comment {
            id
            body
          }
          ... on Post {
            id
            body
          }
        }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  t.deepEqual(
    {
      libraryTexts: [
        {
          __typename: 'Post',
          id: 2,
          body: 'Check out this cool new GraphQL library, Join Monster.',
        },
        {
          __typename: 'Comment',
          id: 8,
          body: 'Somebody please help me with this library. It is so much work.',
        },
      ],
      featureTexts: [
        {
          __typename: 'Comment',
          id: 6,
          body: 'Also, submit a PR if you have a feature you want to add.',
        },
      ],
    },
    data.user,
  )
})
