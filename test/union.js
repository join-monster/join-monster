import test from 'ava'
import { graphql } from 'graphql'
import schema from '../test-api/schema-basic/index'
import { errCheck } from './_util'

test('it should a union type', async (t) => {
  const source = `
    {
      user(id: 1) {
        writtenMaterial1 {
          __typename
          ... on Comment {
            id
            body
            postId
            authorId
            likers {
              fullName
            }
          }
          ...postInfo
        }
      }
    }

    fragment postInfo on Post {
      id
      body
      authorId
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      writtenMaterial1: [
        {
          __typename: 'Comment',
          id: 1,
          body: 'Wow this is a great post, Matt.',
          postId: 1,
          authorId: 1,
          likers: [{ fullName: 'matt elder' }],
        },
        {
          id: 2,
          __typename: 'Post',
          authorId: 1,
          body: 'Check out this cool new GraphQL library, Join Monster.',
        },
        {
          __typename: 'Comment',
          id: 4,
          body: 'Do not forget to check out the demo.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
        {
          __typename: 'Comment',
          id: 6,
          body: 'Also, submit a PR if you have a feature you want to add.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
        {
          __typename: 'Comment',
          id: 8,
          body: 'Somebody please help me with this library. It is so much work.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
      ],
    },
  }
  t.deepEqual(expect, data)
})

test('it should an interface type', async (t) => {
  const source = `
    {
      user(id: 1) {
        writtenMaterial2 {
          __typename
          id
          body
          authorId
          ... on Comment {
            postId
            likers {
              fullName
            }
          }
        }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      writtenMaterial2: [
        {
          __typename: 'Comment',
          id: 1,
          body: 'Wow this is a great post, Matt.',
          postId: 1,
          authorId: 1,
          likers: [{ fullName: 'matt elder' }],
        },
        {
          id: 2,
          __typename: 'Post',
          authorId: 1,
          body: 'Check out this cool new GraphQL library, Join Monster.',
        },
        {
          __typename: 'Comment',
          id: 4,
          body: 'Do not forget to check out the demo.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
        {
          __typename: 'Comment',
          id: 6,
          body: 'Also, submit a PR if you have a feature you want to add.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
        {
          __typename: 'Comment',
          id: 8,
          body: 'Somebody please help me with this library. It is so much work.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
      ],
    },
  }
  t.deepEqual(expect, data)
})

test('it should return single disjoint field request for union type', async (t) => {
  const source = `
    {
      user(id: 1) {
        writtenMaterial1 {
          __typename
          
          ... on Comment {
            id
            author {
              capitalizedLastName # <-- "disjoint" field selection from author type
            }
          }
        }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      writtenMaterial1: [
        {
          __typename: 'Comment',
          id: 1,
          author: {
            capitalizedLastName: 'CARLSON',
          },
        },
        {
          __typename: 'Post',
        },
        {
          __typename: 'Comment',
          id: 4,
          author: {
            capitalizedLastName: 'CARLSON',
          },
        },
        {
          __typename: 'Comment',
          id: 6,
          author: {
            capitalizedLastName: 'CARLSON',
          },
        },
        {
          __typename: 'Comment',
          id: 8,
          author: {
            capitalizedLastName: 'CARLSON',
          },
        },
      ],
    },
  }
  t.deepEqual(expect, data)
})

test('it should return multiple disjoint fields requests for union type', async (t) => {
  const source = `
    {
      user(id: 1) {
        writtenMaterial1 {
          __typename
          
          ... on Comment {
            id
            author {
              capitalizedLastName # <-- First "disjoint" field selection from author type
            }
          }
          ... on Post {
            id
            author {
              email # <-- Second "disjoint" field selection from author type
            }
          }
        }
      }
    }
  `
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      writtenMaterial1: [
        {
          __typename: 'Comment',
          id: 1,
          author: {
            capitalizedLastName: 'CARLSON',
          },
        },
        {
          __typename: 'Post',
          id: 2,
          author: {
            email: 'andrew@stem.is',
          },
        },
        {
          __typename: 'Comment',
          id: 4,
          author: {
            capitalizedLastName: 'CARLSON',
          },
        },
        {
          __typename: 'Comment',
          id: 6,
          author: {
            capitalizedLastName: 'CARLSON',
          },
        },
        {
          __typename: 'Comment',
          id: 8,
          author: {
            capitalizedLastName: 'CARLSON',
          },
        },
      ],
    },
  }
  t.deepEqual(expect, data)
})
