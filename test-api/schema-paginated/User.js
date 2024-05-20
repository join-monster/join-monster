import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import {
  globalIdField,
  connectionArgs,
  forwardConnectionArgs,
  connectionDefinitions,
  connectionFromArray
} from 'graphql-relay'

import IntimacyLevel from '../enums/IntimacyLevel'
import { PostConnection } from './Post'
import { Comment, CommentConnection } from './Comment'
import { nodeInterface } from './Node'
import { AuthoredConnection } from './Authored/Interface'
import { q, bool } from '../shared'

const { PAGINATE, STRATEGY, DB } = process.env

const User = new GraphQLObjectType({
  description: 'a stem contract account',
  name: 'User',
  extensions: {
    joinMonster: {
      sqlTable: `(SELECT * FROM ${q('accounts', DB)})`,
      uniqueKey: 'id'
    }
  },
  interfaces: [nodeInterface],
  fields: () => ({
    id: {
      description: 'The global ID for the Relay spec',
      ...globalIdField('User'),
      extensions: {
        joinMonster: {
          sqlDeps: ['id']
        }
      }
    },
    email: {
      type: GraphQLString,
      extensions: {
        joinMonster: {
          sqlColumn: 'email_address'
        }
      }
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
      type: CommentConnection,
      args: {
        active: { type: GraphQLBoolean },
        ...(PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs)
      },
      resolve: PAGINATE
        ? undefined
        : (user, args) => {
          user.comments.sort((a, b) => a.id - b.id)
          return connectionFromArray(user.comments, args)
        },
      extensions: {
        joinMonster: {
          sqlPaginate: !!PAGINATE,
          sqlDefaultPageSize: 2,
          sqlPageLimit: 100,
          [PAGINATE === 'keyset' ? 'sortKey' : 'orderBy']: () => [
            { column: 'id', direction: 'asc' }
          ],
          ...(STRATEGY === 'batch' || STRATEGY === 'mix' ?
            {
              sqlBatch: {
                thisKey: 'author_id',
                parentKey: 'id'
              },
              where: (table, args) =>
                args.active
                  ? `${table}.${q('archived', DB)} = ${bool(false, DB)}`
                  : null
            } :
            {
              sqlJoin: (userTable, commentTable, args) =>
                `${commentTable}.${q('author_id', DB)} = ${userTable}.${q(
                  'id',
                  DB
                )} ${args.active
                  ? `AND ${commentTable}.${q('archived', DB)} = ${bool(
                    false,
                    DB
                  )}`
                  : ''
                }`
            }
          )
        }
      }
    },
    commentsLast2: {
      type: new GraphQLList(Comment),
      extensions: {
        joinMonster: {
          orderBy: { id: 'desc' },
          limit: () => 2,
          ...(STRATEGY === 'batch'
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
    numPosts: {
      description: 'Count of Posts the user has written',
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          // do a computed column in SQL with raw expression
          sqlExpr: (table, args) => `(SELECT COUNT(*) FROM posts WHERE author_id = ${table}.id)`
        }
      }
    },
    posts: {
      description: 'A list of Posts the user has written',
      type: PostConnection,
      args: {
        search: { type: GraphQLString },
        ...(PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs)
      },
      resolve: PAGINATE
        ? undefined
        : (user, args) => {
          user.posts.sort((a, b) => a.id - b.id)
          return connectionFromArray(user.posts, args)
        },
      extensions: {
        joinMonster: {
          sqlPaginate: !!PAGINATE,
          [PAGINATE === 'keyset' ? 'sortKey' : 'orderBy']: () => [
            { column: 'created_at', direction: 'desc' },
            { column: 'id', direction: 'asc' }
          ],
          where: (table, args) => {
            if (args.search)
              return `lower(${table}.${q('body', DB)}) LIKE lower('%${args.search
                }%')`
          },
          ...(STRATEGY === 'batch' ?
            {
              sqlBatch: {
                thisKey: 'author_id',
                parentKey: 'id'
              }
            } : {
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
      type: UserConnection,
      args: {
        ...(PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs),
        intimacy: { type: IntimacyLevel },
        sortOnMain: { type: GraphQLBoolean },
        by: { type: GraphQLString }
      },
      resolve: PAGINATE
        ? undefined
        : (user, args) => {
          return connectionFromArray(user.following, args)
        },
      extensions: {
        joinMonster: {
          where: table => `${table}.${q('email_address', DB)} IS NOT NULL`,
          sqlPaginate: !!PAGINATE,
          [PAGINATE === 'keyset' ? 'sortKey' : 'orderBy']: args =>
            args.sortOnMain
              ? (args.by === 'numPosts' ? [
                { column: 'numPosts', direction: 'DESC' },
                { column: 'id', direction: 'ASC' }
              ] : [
                { column: 'created_at', direction: 'ASC' },
                { column: 'id', direction: 'ASC' }
              ])
              : null,
          junction: {
            sqlTable: `(SELECT * FROM ${q('relationships', DB)})`,
            [PAGINATE === 'keyset' ? 'sortKey' : 'orderBy']: args =>
              args.sortOnMain
                ? null
                : args.by === 'intimacy' ? [
                  { column: 'intimacy', direction: 'DESC' },
                  { column: 'followee_id', direction: 'ASC' }
                ] : [
                  { column: 'created_at', direction: 'ASC' },
                  { column: 'followee_id', direction: 'ASC' }
                ],
            where: (table, args) =>
              args.intimacy
                ? `${table}.${q('closeness', DB)} = '${args.intimacy}'`
                : null,
            include: {
              friendship: {
                sqlColumn: 'closeness',
                ignoreAll: false
              },
              intimacy: {
                sqlExpr: table => `${table}.${q('closeness', DB)}`,
                ignoreAll: false
              },
              closeness: {
                sqlDeps: ['closeness'],
                ignoreAll: false
              }
            },
            ...(STRATEGY === 'batch' || STRATEGY === 'mix' ?
              {
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
              } :
              {
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
              }
            )
          }
        }
      }
    },
    followingFirst: {
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          limit: 1,
          orderBy: 'followee_id',
          junction: {
            sqlTable: q('relationships', DB),
            ...(STRATEGY === 'batch' || STRATEGY === 'mix' ?
              {
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
              } :
              {
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
              }
            )
          }
        }
      }
    },
    writtenMaterial: {
      type: AuthoredConnection,
      args: PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs,
      resolve: PAGINATE
        ? undefined
        : (user, args) => {
          return connectionFromArray(user.following, args)
        },
      extensions: {
        joinMonster: {
          sqlPaginate: !!PAGINATE,
          ...(PAGINATE === 'offset' ?
            {
              orderBy: [
                { column: 'id', direction: 'ASC' },
                { column: 'created_at', direction: 'ASC' }
              ]
            } :
            PAGINATE === 'keyset' ?
              {
                sortKey: {
                  order: 'ASC',
                  key: ['id', 'created_at']
                }
              } : {
                orderBy: 'id'
              }
          ),
          ...(STRATEGY === 'batch'
            ? {
              sqlBatch: {
                thisKey: 'author_id',
                parentKey: 'id'
              }
            }
            : {
              sqlJoin: (userTable, unionTable) =>
                `${userTable}.${q('id', DB)} = ${unionTable}.${q(
                  'author_id',
                  DB
                )}`
            })
        }
      }
    },
    friendship: {
      type: GraphQLString,
      extensions: {
        joinMonster: {
          ignoreAll: true
        }
      }
    },
    intimacy: {
      type: GraphQLString,
      extensions: {
        joinMonster: {
          ignoreAll: true
        }
      }
    },
    closeness: {
      type: GraphQLString,
      extensions: {
        joinMonster: {
          ignoreAll: true
        }
      }
    },
    favNums: {
      type: new GraphQLList(GraphQLInt),
      resolve: () => [1, 2, 3]
    },
    numLegs: {
      description: 'How many legs this user has',
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          sqlColumn: 'num_legs'
        }
      }
    },
    numFeet: {
      description: 'How many feet this user has',
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          sqlDeps: ['num_legs']
        }
      },
      resolve: user => user.num_legs
    }
  })
})

const connectionConfig = { nodeType: new GraphQLNonNull(User) }
if (PAGINATE === 'offset') {
  connectionConfig.connectionFields = {
    total: { type: GraphQLInt }
  }
}
const { connectionType: UserConnection } = connectionDefinitions(
  connectionConfig
)

export { User, UserConnection }
