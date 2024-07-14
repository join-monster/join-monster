import test from 'ava'
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLInt,
  GraphQLString,
  GraphQLBoolean,
  GraphQLNonNull,
} from 'graphql'
import { errCheck, getDatabaseOptions } from './_util'
import { q } from '../test-api/shared'

import knex from '../test-api/data/database'
import dbCall from '../test-api/data/fetch'

import joinMonster from '../src/index'

const { db: DB, strategy: STRATEGY, ...options } = getDatabaseOptions(knex)

const Comment = new GraphQLObjectType({
  name: 'Comment',
  extensions: {
    joinMonster: {
      sqlTable: q('comments', DB),
      uniqueKey: 'id'
    }
  },
  fields: () => ({
    id: {
      type: GraphQLInt
    },
  })
})

const Post = new GraphQLObjectType({
  name: 'Post',
  extensions: {
    joinMonster: {
      sqlTable: q('posts', DB),
      uniqueKey: 'id'
    }
  },
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    comments: {
      description: 'The comments on this post',
      type: new GraphQLList(Comment),
      args: {
        asc: { type: GraphQLBoolean }
      },
      extensions: {
        joinMonster: {
          orderBy: args => ({ id: args.asc ? 'asc' : 'desc' }),
          ...(['batch', 'mix'].includes(STRATEGY)
            ? {
              sqlBatch: {
                thisKey: 'post_id',
                parentKey: 'id'
              },
            }
            : {
              sqlJoin: (postTable, commentTable) =>
                `${commentTable}.${q('post_id', DB)} = ${postTable}.${q(
                  'id',
                  DB
                )}`
            })
        }
      }
    },
  })
})

const User = new GraphQLObjectType({
  description: 'a stem contract account',
  name: 'User',
  extensions: {
    joinMonster: {
      sqlTable: () => q('accounts', DB),
      uniqueKey: 'id'
    }
  },
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    fullName: {
      description: "A user's first and last name",
      type: GraphQLString,
      extensions: {
        joinMonster: {
          sqlDeps: ['first_name', 'last_name']
        }
      },
      resolve: user => `${user.first_name} ${user.last_name}`
    },
    comments: {
      description: "Comments the user has written on people's posts",
      type: new GraphQLList(new GraphQLNonNull(Comment)),
      extensions: {
        joinMonster: {
          orderBy: { id: 'asc' },
          ...(['batch', 'mix'].includes(STRATEGY)
            ? {
              sqlBatch: {
                thisKey: 'author_id',
                parentKey: 'id'
              }
            }
            : {
              sqlJoin: (userTable, commentTable) =>
                `${commentTable}.${q('author_id', DB)} = ${userTable}.${q(
                  'id',
                  DB
                )}`
            })
        }
      }
    },
    posts: {
      description: 'A list of Posts the user has written',
      type: new GraphQLList(Post),
      extensions: {
        joinMonster: {
          orderBy: { body: 'desc' },
          ...(STRATEGY === 'batch'
            ? {
              sqlBatch: {
                thisKey: 'author_id',
                parentKey: 'id'
              }
            }
            : {
              sqlJoin: (userTable, postTable) =>
                `${postTable}.${q('author_id', DB)} = ${userTable}.${q(
                  'id',
                  DB
                )}`
            })
        }
      }
    },
    following: {
      description: 'Users that this user is following',
      type: new GraphQLList(User),
      args: {
        oldestFirst: { type: GraphQLBoolean },
      },
      extensions: {
        joinMonster: {
          orderBy: 'first_name',
          junction: {
            sqlTable: q('relationships', DB),
            orderBy: args =>
              args.oldestFirst ? { followee_id: 'desc' } : null,
            ...(['batch', 'mix'].includes(STRATEGY)
              ? {
                uniqueKey: ['follower_id', 'followee_id'],
                sqlBatch: {
                  thisKey: 'follower_id',
                  parentKey: 'id',
                  sqlJoin: (relationTable, followeeTable) =>
                    `${relationTable}.${q(
                      'followee_id',
                      DB
                    )} = ${followeeTable}.${q('id', DB)}`
                }
              }
              : {
                sqlJoins: [
                  (followerTable, relationTable) =>
                    `${followerTable}.${q('id', DB)} = ${relationTable}.${q(
                      'follower_id',
                      DB
                    )}`,
                  (relationTable, followeeTable) =>
                    `${relationTable}.${q(
                      'followee_id',
                      DB
                    )} = ${followeeTable}.${q('id', DB)}`
                ]
              })
          }
        }
      }
    },
  })
})

const schema = new GraphQLSchema({
  description: 'a test schema',
  query: new GraphQLObjectType({
    description: 'global query object',
    name: 'Query',
    fields: () => ({
      user: {
        type: User,
        args: {
          id: {
            description: 'The users ID number',
            type: GraphQLInt
          },
        },
        extensions: {
          joinMonster: {
            where: (usersTable, args) => {
              if (args.id) return `${usersTable}.${q('id', DB)} = ${args.id}`
            }
          }
        },
        resolve: async (parent, args, context, resolveInfo) => {
          return joinMonster(
            resolveInfo,
            context,
            sql => dbCall(sql, knex, context),
            options
          )
        }
      }
    })
  })
})

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

test('it should handle order on many-to-many', async t => {
  const source = `{
    user(id: 3) {
      fullName
      following {
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

test('it should handle order on many-to-many in junction', async t => {
  const source = `{
    user(id: 3) {
      fullName
      following(oldestFirst: true) {
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
