import test from 'ava'
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLNonNull,
  GraphQLBoolean,
} from 'graphql'
import {
  offsetToCursor,
  toGlobalId,
  globalIdField,
  connectionDefinitions,
  connectionArgs,
  forwardConnectionArgs,
} from 'graphql-relay'
import { objToCursor } from '../../../src/util'
import { errCheck, getDatabaseOptions } from '../../_util'
import { q } from '../../../test-api/shared'

import knex from '../../../test-api/data/database'
import dbCall from '../../../test-api/data/fetch'

import joinMonster from '../../../src/index'

const {
  paginate: PAGINATE,
  db: DB,
  strategy: STRATEGY,
  ...options
} = getDatabaseOptions(knex)

const User = new GraphQLObjectType({
  description: 'a stem contract account',
  name: 'User',
  extensions: {
    joinMonster: {
      sqlTable: `(SELECT * FROM ${q('accounts', DB)})`,
      uniqueKey: 'id',
    },
  },
  fields: () => ({
    id: {
      description: 'The global ID for the Relay spec',
      ...globalIdField('User'),
      extensions: {
        joinMonster: {
          sqlDeps: ['id'],
        },
      },
    },
    fullName: {
      description: "A user's first and last name",
      type: GraphQLString,
      extensions: {
        joinMonster: {
          sqlDeps: ['first_name', 'last_name'],
        },
      },
      resolve: (user) => `${user.first_name} ${user.last_name}`,
    },
    following: {
      description: 'Users that this user is following',
      type: UserConnection,
      args: {
        ...(PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs),
        sortOnMain: { type: GraphQLBoolean },
      },
      extensions: {
        joinMonster: {
          where: (table) => `${table}.${q('email_address', DB)} IS NOT NULL`,
          sqlPaginate: !!PAGINATE,
          ...(PAGINATE === 'offset'
            ? {
                orderBy: (args) =>
                  args.sortOnMain
                    ? [
                        { column: 'created_at', direction: 'ASC' },
                        { column: 'id', direction: 'ASC' },
                      ]
                    : null,
              }
            : {}),
          ...(PAGINATE === 'keyset'
            ? {
                sortKey: (args) =>
                  args.sortOnMain
                    ? {
                        order: 'ASC',
                        key: ['created_at', 'id'],
                      }
                    : null,
              }
            : {}),
          junction: {
            sqlTable: `(SELECT * FROM ${q('relationships', DB)})`,
            where: (table, args) =>
              args.intimacy
                ? `${table}.${q('closeness', DB)} = '${args.intimacy}'`
                : null,
            ...(PAGINATE === 'offset'
              ? {
                  orderBy: (args) =>
                    args.sortOnMain
                      ? null
                      : {
                          created_at: 'DESC',
                          followee_id: 'ASC',
                        },
                }
              : {}),
            ...(PAGINATE === 'keyset'
              ? {
                  sortKey: (args) =>
                    args.sortOnMain
                      ? null
                      : [
                          { direction: 'ASC', column: 'created_at' },
                          { direction: 'ASC', column: 'followee_id' },
                        ],
                }
              : {}),
            ...(STRATEGY === 'batch' || STRATEGY === 'mix'
              ? {
                  uniqueKey: ['follower_id', 'followee_id'],
                  sqlBatch: {
                    thisKey: 'follower_id',
                    parentKey: 'id',
                    sqlJoin: (relationTable, followeeTable) =>
                      `${relationTable}.${q(
                        'followee_id',
                        DB,
                      )} = ${followeeTable}.${q('id', DB)}`,
                  },
                }
              : {
                  sqlJoins: [
                    (followerTable, relationTable) =>
                      `${followerTable}.${q('id', DB)} = ${relationTable}.${q(
                        'follower_id',
                        DB,
                      )}`,
                    (relationTable, followeeTable) =>
                      `${relationTable}.${q(
                        'followee_id',
                        DB,
                      )} = ${followeeTable}.${q('id', DB)}`,
                  ],
                }),
          },
        },
      },
    },
  }),
})

const connectionConfig = { nodeType: new GraphQLNonNull(User) }
if (PAGINATE === 'offset') {
  connectionConfig.connectionFields = {
    total: { type: GraphQLInt },
  }
}
const { connectionType: UserConnection } =
  connectionDefinitions(connectionConfig)

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
            type: GraphQLInt,
          },
        },
        extensions: {
          joinMonster: {
            where: (usersTable, args) => {
              if (args.id) return `${usersTable}.${q('id', DB)} = ${args.id}`
            },
          },
        },
        resolve: async (parent, args, context, resolveInfo) => {
          return joinMonster(
            resolveInfo,
            context,
            (sql) => dbCall(sql, knex, context),
            options,
          )
        },
      },
    }),
  }),
})

if (PAGINATE === 'keyset') {
  test('[keyset] should handle order columns on the main table', async (t) => {
    const source = `{
      user(id: 2) {
        fullName
        following(first: 2, sortOnMain: true, after: "${objToCursor({
          created_at: '2015-10-19T05:48:04.537Z',
          id: 3,
        })}") {
          edges {
            node {
              id
              fullName
            }
          }
        }
      }
    }`
    const { data, errors } = await graphql({ schema, source })
    errCheck(t, errors)
    const expect = {
      user: {
        fullName: 'Hudson Hyatt',
        following: {
          edges: [
            {
              node: {
                id: toGlobalId('User', 1),
                fullName: 'Alivia Waelchi',
              },
            },
            {
              node: {
                id: toGlobalId('User', 2),
                fullName: 'Hudson Hyatt',
              },
            },
          ],
        },
      },
    }
    t.deepEqual(expect, data)
  })

  test('[keyset] should handle order columns on the junction table', async (t) => {
    const cursor = objToCursor({
      created_at: '2016-01-01T16:28:00.051Z',
      followee_id: 1,
    })
    const source = `{
      user(id: 2) {
        fullName
        following(first: 2, sortOnMain: false, after: "${cursor}") {
          edges {
            node {
              id
              fullName
            }
          }
        }
      }
    }`
    const { data, errors } = await graphql({ schema, source })
    errCheck(t, errors)
    const expect = {
      user: {
        fullName: 'Hudson Hyatt',
        following: {
          edges: [
            {
              node: {
                id: toGlobalId('User', 3),
                fullName: 'Coleman Abernathy',
              },
            },
            {
              node: {
                id: toGlobalId('User', 2),
                fullName: 'Hudson Hyatt',
              },
            },
          ],
        },
      },
    }
    t.deepEqual(expect, data)
  })
}

if (PAGINATE === 'offset') {
  test('[offset] should handle order columns on the main table', async (t) => {
    const source = `{
      user(id: 2) {
        fullName
        following(first: 2, sortOnMain: true, after: "${offsetToCursor(0)}") {
          edges {
            node {
              id
              fullName
            }
          }
        }
      }
    }`
    const { data, errors } = await graphql({ schema, source })
    errCheck(t, errors)
    const expect = {
      user: {
        fullName: 'Hudson Hyatt',
        following: {
          edges: [
            {
              node: {
                id: toGlobalId('User', 1),
                fullName: 'Alivia Waelchi',
              },
            },
            {
              node: {
                id: toGlobalId('User', 2),
                fullName: 'Hudson Hyatt',
              },
            },
          ],
        },
      },
    }
    t.deepEqual(expect, data)
  })

  test('[offset] should handle order columns on the junction table', async (t) => {
    const source = `{
      user(id: 2) {
        fullName
        following(first: 2, sortOnMain: false, after: "${offsetToCursor(0)}") {
          edges {
            node {
              id
              fullName
            }
          }
        }
      }
    }`
    const { data, errors } = await graphql({ schema, source })
    errCheck(t, errors)
    const expect = {
      user: {
        fullName: 'Hudson Hyatt',
        following: {
          edges: [
            {
              node: {
                id: toGlobalId('User', 2),
                fullName: 'Hudson Hyatt',
              },
            },
            {
              node: {
                id: toGlobalId('User', 3),
                fullName: 'Coleman Abernathy',
              },
            },
          ],
        },
      },
    }
    t.deepEqual(expect, data)
  })
}
