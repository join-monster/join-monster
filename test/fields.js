import test from 'ava'
import { graphql } from 'graphql'
import schema from '../test-api/schema-basic/index'
import { errCheck } from './_util'


test('it should handle duplicate scalar field', async t => {
  const source = `{
    user(id: 1) {
      fullName
      fullName
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'andrew carlson'
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle duplicate object type field', async t => {
  const source = `{
    user(id: 1) {
      posts {
        body
        authorId
      }
      posts {
        authorId
      }
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    user: {
      posts: [
        {
          body: 'Check out this cool new GraphQL library, Join Monster.',
          authorId: 1
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle duplicate object type fields with different arguments', async t => {
  const source = `{
    user(id: 3) {
      comments: comments(active: true) {
        id
      }
      archivedComments: comments(active: false) {
        id
      }
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    user: {
      comments: [{ id: 3 }, { id: 5 }, { id: 9 }],
      archivedComments: [{ id: 2 }, { id: 3 }, { id: 5 }, { id: 9 }]
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle duplicate of a field off the query root', async t => {
  const source = `{
    user(id: 1) {
      fullName
    }
    user(id: 1) {
      email
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    fullName: 'andrew carlson',
    email: 'andrew@stem.is'
  }
  t.deepEqual(expect, data.user)
})

test('it should handle duplicate of a field off the query root with aliases', async t => {
  const source = `{
    thing1: user(id: 1) {
      fullName
    }
    thing2: user(id: 1) {
      email
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    thing1: {
      fullName: 'andrew carlson'
    },
    thing2: {
      email: 'andrew@stem.is'
    }
  }
  t.deepEqual(expect, data)
})

test('it should handle duplicate of a field recursively', async t => {
  const source = `{
    user(id: 2) {
      fullName
      posts {
        id
        comments {
          authorId
          bdy: body
        }
      }
      posts {
        authorId
        comments {
          body
        }
      }
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    fullName: 'matt elder',
    posts: [
      {
        id: 1,
        comments: [
          {
            authorId: 3,
            bdy: "That's ultra weird bro.",
            body: "That's ultra weird bro."
          },
          {
            authorId: 3,
            bdy: "That's super weird dude.",
            body: "That's super weird dude."
          },
          {
            authorId: 1,
            bdy: 'Wow this is a great post, Matt.',
            body: 'Wow this is a great post, Matt.'
          }
        ],
        authorId: 2
      },
      {
        id: 3,
        comments: [
          {
            authorId: 3,
            bdy: 'Yeah well Java 8 added lambdas.',
            body: 'Yeah well Java 8 added lambdas.'
          }
        ],
        authorId: 2
      }
    ]
  }
  t.deepEqual(expect, data.user)
})
