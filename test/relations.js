import test from 'ava'
import { graphql } from 'graphql'
import schemaBasic from '../test-api/schema-basic/index'
import { partial } from 'lodash'
import { errCheck } from './_util'

function wrap(query, id) {
  if (id) {
    return `{
      user(id: ${id}) { ${query} }
    }`
  }
  return `{
    users { ${query} }
  }`
}

const run = partial(graphql, schemaBasic)

test('should join a one-to-many relation', async t => {
  const query = wrap('id, comments { id, body }')
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    users: [
      {
        id: 1,
        comments: [
          {
            id: 1,
            body: 'Wow this is a great post, Matt.'
          },
          {
            id: 4,
            body: 'Do not forget to check out the demo.'
          },
          {
            id: 6,
            body: 'Also, submit a PR if you have a feature you want to add.'
          },
          {
            id: 8,
            body: 'Somebody please help me with this library. It is so much work.'
          }
        ]
      },
      {
        id: 2,
        comments: [
          {
            id: 7,
            body: 'FIRST COMMENT!'
          }
        ]
      },
      {
        id: 3,
        comments: [
          {
            id: 2,
            body: 'That\'s super weird dude.'
          },
          {
            id: 3,
            body: 'That\'s ultra weird bro.'
          },
          {
            id: 5,
            body: 'This sucks. Go use REST you scrub.'
          },
          {
            id: 9,
            body: 'Yeah well Java 8 added lambdas.'
          }
        ]
      }
    ]
  }
  t.deepEqual(expect, data)
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
  errCheck(t, errors)
  const expect = {
    users: [
      {
        comments: [
          {
            id: 1,
            body: 'Wow this is a great post, Matt.',
            author: { fullName: 'andrew carlson' }
          },
          {
            id: 4,
            body: 'Do not forget to check out the demo.',
            author: { fullName: 'andrew carlson' }
          },
          {
            id: 6,
            body: 'Also, submit a PR if you have a feature you want to add.',
            author: { fullName: 'andrew carlson' }
          },
          {
            id: 8,
            body: 'Somebody please help me with this library. It is so much work.',
            author: { fullName: 'andrew carlson' }
          }
        ]
      },
      {
        comments: [
          {
            id: 7,
            body: 'FIRST COMMENT!',
            author: { fullName: 'matt elder' }
          }
        ]
      },
      {
        comments: [
          {
            id: 2,
            body: 'That\'s super weird dude.',
            author: { fullName: 'foo bar' }
          },
          {
            id: 3,
            body: 'That\'s ultra weird bro.',
            author: { fullName: 'foo bar' }
          },
          {
            id: 5,
            body: 'This sucks. Go use REST you scrub.',
            author: { fullName: 'foo bar' }
          },
          {
            id: 9,
            body: 'Yeah well Java 8 added lambdas.',
            author: { fullName: 'foo bar' }
          }
        ]
      }
    ]
  }
  t.deepEqual(expect, data)
})

test('should handle where conditions on the relations', async t => {
  const query = wrap(`
    posts(active: true) {
      id
      body
      archived
      numComments
      comments(active: true) {
        id
        body
        archived
      }
    }
    comments(active: true) {
      id
      archived
      body
    }
  `, 2)
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      posts: [
        {
          id: 1,
          body: 'If I could marry a programming language, it would be Haskell.',
          archived: false,
          numComments: 3,
          comments: [
            {
              id: 3,
              body: 'That\'s ultra weird bro.',
              archived: false
            },
            {
              id: 1,
              body: 'Wow this is a great post, Matt.',
              archived: false
            }
          ]
        }
      ],
      comments: []
    }
  }
  t.deepEqual(expect, data)
})

test('should handle where condition on many-to-many relation', async t => {
  const query = wrap(`
    id
    fullName
    following(name: "matt") {
      fullName
    }
  `, 3)
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      id: 3,
      fullName: 'foo bar',
      following: [
        { fullName: 'matt elder' }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('should include data from the junction table', async t => {
  const query = wrap(`
    id
    fullName
    following {
      id
      fullName
      friendship # this tests sqlColumn
      intimacy # this one tests sqlExpr
      closeness # and this one tests sqlDeps
    }
  `, 3)
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      id: 3,
      fullName: 'foo bar',
      following: [
        {
          id: 1,
          fullName: 'andrew carlson',
          friendship: 'acquaintance',
          intimacy: 'acquaintance',
          closeness: 'acquaintance'
        },
        {
          id: 2,
          fullName: 'matt elder',
          friendship: 'best',
          intimacy: 'best',
          closeness: 'best'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('should handle where condition on junction in many-to-many', async t => {
  const query = wrap(`
    id
    fullName
    following(intimacy: best) {
      fullName
      intimacy
    }
  `, 3)
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      id: 3,
      fullName: 'foo bar',
      following: [
        {
          fullName: 'matt elder',
          intimacy: 'best'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
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
  errCheck(t, errors)
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
            author: {
              fullName: 'andrew carlson'
            },
            post: {
              id: 1,
              body: 'If I could marry a programming language, it would be Haskell.',
              author: {
                fullName: 'matt elder'
              }
            }
          },
          {
            id: 4,
            body: 'Do not forget to check out the demo.',
            author: {
              fullName: 'andrew carlson'
            },
            post: {
              id: 2,
              body: 'Check out this cool new GraphQL library, Join Monster.',
              author: {
                fullName: 'andrew carlson'
              }
            }
          },
          {
            id: 6,
            body: 'Also, submit a PR if you have a feature you want to add.',
            author: {
              fullName: 'andrew carlson'
            },
            post: {
              id: 2,
              body: 'Check out this cool new GraphQL library, Join Monster.',
              author: {
                fullName: 'andrew carlson'
              }
            }
          },
          {
            id: 8,
            body: 'Somebody please help me with this library. It is so much work.',
            author: {
              fullName: 'andrew carlson'
            },
            post: {
              id: 2,
              body: 'Check out this cool new GraphQL library, Join Monster.',
              author: {
                fullName: 'andrew carlson'
              }
            }
          }
        ]
      },
      {
        idEncoded: 'Mg==',
        globalId: 'VXNlcjoy',
        email: 'matt@stem.is',
        fullName: 'matt elder',
        comments: [
          {
            id: 7,
            body: 'FIRST COMMENT!',
            author: {
              fullName: 'matt elder'
            },
            post: {
              id: 2,
              body: 'Check out this cool new GraphQL library, Join Monster.',
              author: {
                fullName: 'andrew carlson'
              }
            }
          }
        ]
      },
      {
        idEncoded: 'Mw==',
        globalId: 'VXNlcjoz',
        email: 'foo@example.org',
        fullName: 'foo bar',
        comments: [
          {
            id: 2,
            body: 'That\'s super weird dude.',
            author: {
              fullName: 'foo bar'
            },
            post: {
              id: 1,
              body: 'If I could marry a programming language, it would be Haskell.',
              author: {
                fullName: 'matt elder'
              }
            }
          },
          {
            id: 3,
            body: 'That\'s ultra weird bro.',
            author: {
              fullName: 'foo bar'
            },
            post: {
              id: 1,
              body: 'If I could marry a programming language, it would be Haskell.',
              author: {
                fullName: 'matt elder'
              }
            }
          },
          {
            id: 5,
            body: 'This sucks. Go use REST you scrub.',
            author: {
              fullName: 'foo bar'
            },
            post: {
              id: 2,
              body: 'Check out this cool new GraphQL library, Join Monster.',
              author: {
                fullName: 'andrew carlson'
              }
            }
          },
          {
            id: 9,
            body: 'Yeah well Java 8 added lambdas.',
            author: {
              fullName: 'foo bar'
            },
            post: {
              id: 3,
              body: 'Here is who to contact if your brain has been ruined by Java.',
              author: {
                fullName: 'matt elder'
              }
            }
          }
        ]
      }
    ]
  }
  t.deepEqual(expect, data)
})

test('it should handle many to many relationship', async t => {
  const query = wrap(`
    id
    fullName
    following { fullName }
  `)
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    users: [
      {
        id: 1,
        fullName: 'andrew carlson',
        following: [
          {
            fullName: 'matt elder'
          }
        ]
      },
      {
        id: 2,
        fullName: 'matt elder',
        following: []
      },
      {
        id: 3,
        fullName: 'foo bar',
        following: [
          {
            fullName: 'andrew carlson'
          },
          {
            fullName: 'matt elder'
          }
        ]
      }
    ]
  }
  t.deepEqual(expect, data)
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
  errCheck(t, errors)
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
          },
          {
            id: 4,
            body: 'Do not forget to check out the demo.',
            post: {
              body: 'Check out this cool new GraphQL library, Join Monster.'
            }
          },
          {
            id: 6,
            body: 'Also, submit a PR if you have a feature you want to add.',
            post: {
              body: 'Check out this cool new GraphQL library, Join Monster.'
            }
          },
          {
            id: 8,
            body: 'Somebody please help me with this library. It is so much work.',
            post: {
              body: 'Check out this cool new GraphQL library, Join Monster.'
            }
          }
        ]
      },
      {
        id: 2,
        comments: [
          {
            id: 7,
            body: 'FIRST COMMENT!',
            post: {
              body: 'Check out this cool new GraphQL library, Join Monster.'
            }
          }
        ]
      },
      {
        id: 3,
        comments: [
          {
            id: 2,
            body: 'That\'s super weird dude.',
            post: {
              body: 'If I could marry a programming language, it would be Haskell.'
            }
          },
          {
            id: 3,
            body: 'That\'s ultra weird bro.',
            post: {
              body: 'If I could marry a programming language, it would be Haskell.'
            }
          },
          {
            id: 5,
            body: 'This sucks. Go use REST you scrub.',
            post: {
              body: 'Check out this cool new GraphQL library, Join Monster.'
            }
          },
          {
            id: 9,
            body: 'Yeah well Java 8 added lambdas.',
            post: {
              body: 'Here is who to contact if your brain has been ruined by Java.'
            }
          }
        ]
      }
    ]
  }
  t.deepEqual(expect, data)
})

test('should handle a correlated subquery', async t => {
  const query = wrap(`
    posts(active: false) {
      id
      body
      archived
      numComments
    }
  `, 2)
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      posts: [
        {
          id: 1,
          body: 'If I could marry a programming language, it would be Haskell.',
          archived: false,
          numComments: 3
        },
        {
          id: 3,
          body: 'Here is who to contact if your brain has been ruined by Java.',
          archived: true,
          numComments: 1
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})
