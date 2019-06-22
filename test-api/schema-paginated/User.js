import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';

import {
  globalIdField,
  connectionArgs,
  forwardConnectionArgs,
  connectionDefinitions,
  connectionFromArray,
} from 'graphql-relay';

import IntimacyLevel from '../enums/IntimacyLevel';
import {PostConnection} from './Post';
import {Comment, CommentConnection} from './Comment';
import {nodeInterface} from './Node';
import {AuthoredConnection} from './Authored/Interface';
import {q, bool} from '../shared';

const {PAGINATE, STRATEGY, DB} = process.env;

const User = new GraphQLObjectType({
  description: 'a stem contract account',
  name: 'User',
  sqlTable: `(SELECT * FROM ${q('accounts', DB)})`,
  uniqueKey: 'id',
  interfaces: [nodeInterface],
  fields: () => ({
    id: {
      description: 'The global ID for the Relay spec',
      ...globalIdField('User'),
      sqlDeps: ['id'],
    },
    email: {
      type: GraphQLString,
      sqlColumn: 'email_address',
    },
    fullName: {
      description: "A user's first and last name",
      type: GraphQLString,
      sqlDeps: ['first_name', 'last_name'],
      resolve: (user) => `${user.first_name} ${user.last_name}`,
    },
    comments: {
      description: "Comments the user has written on people's posts",
      type: CommentConnection,
      args: {
        active: {type: GraphQLBoolean},
        ...(PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs),
      },
      sqlPaginate: !!PAGINATE,
      ...(function() {
        if (PAGINATE === 'offset') {
          return {orderBy: 'id'};
        }

        if (PAGINATE === 'keyset') {
          return {
            sortKey: {
              order: 'desc',
              key: 'id',
            },
          };
        }

        return {
          resolve: (user, args) => {
            user.comments.sort((a, b) => a.id - b.id);
            return connectionFromArray(user.comments, args);
          },
        };
      })(),
      ...(function() {
        if (STRATEGY === 'batch' || STRATEGY === 'mix') {
          return {
            sqlBatch: {
              thisKey: 'author_id',
              parentKey: 'id',
            },
            where: (table, args) =>
              args.active
                ? `${table}.${q('archived', DB)} = ${bool(false, DB)}`
                : null,
          };
        }

        return {
          sqlJoin: (userTable, commentTable, args) =>
            `${commentTable}.${q('author_id', DB)} = ${userTable}.${q(
              'id',
              DB
            )} ${
              args.active
                ? `AND ${commentTable}.${q('archived', DB)} = ${bool(
                    false,
                    DB
                  )}`
                : ''
            }`,
        };
      })(),
    },
    commentsLast2: {
      type: new GraphQLList(Comment),
      orderBy: {id: 'desc'},
      limit: () => 2,
      ...(STRATEGY === 'batch'
        ? {
            sqlBatch: {
              thisKey: 'author_id',
              parentKey: 'id',
            },
          }
        : {
            sqlJoin: (userTable, commentTable) =>
              `${commentTable}.${q('author_id', DB)} = ${userTable}.${q(
                'id',
                DB
              )}`,
          }),
    },
    posts: {
      description: 'A list of Posts the user has written',
      type: PostConnection,
      args: {
        search: {type: GraphQLString},
        ...(PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs),
      },
      sqlPaginate: !!PAGINATE,
      ...(function() {
        if (PAGINATE === 'offset') {
          return {
            orderBy: (args) => ({
              // eslint-disable-line no-unused-vars
              created_at: 'desc',
              id: 'asc',
            }),
          };
        }

        if (PAGINATE === 'keyset') {
          return {
            sortKey: (args) => ({
              // eslint-disable-line no-unused-vars
              order: 'desc',
              key: ['created_at', 'id'],
            }),
          };
        }

        return {
          resolve: (user, args) => {
            user.posts.sort((a, b) => a.id - b.id);
            return connectionFromArray(user.posts, args);
          },
        };
      })(),
      where: (table, args) => {
        if (args.search)
          return `lower(${table}.${q('body', DB)}) LIKE lower('%${
            args.search
          }%')`;
      },
      ...(function() {
        if (STRATEGY === 'batch') {
          return {
            sqlBatch: {
              thisKey: 'author_id',
              parentKey: 'id',
            },
          };
        }

        return {
          sqlJoin: (userTable, postTable) =>
            `${postTable}.${q('author_id', DB)} = ${userTable}.${q('id', DB)}`,
        };
      })(),
    },
    following: {
      description: 'Users that this user is following',
      type: UserConnection,
      args: {
        ...(PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs),
        intimacy: {type: IntimacyLevel},
        sortOnMain: {type: GraphQLBoolean},
      },
      where: (table) => `${table}.${q('email_address', DB)} IS NOT NULL`,
      sqlPaginate: !!PAGINATE,
      ...(function() {
        if (PAGINATE === 'offset') {
          return {
            orderBy: (args) =>
              args.sortOnMain
                ? {
                    created_at: 'ASC',
                    id: 'ASC',
                  }
                : null,
          };
        }

        if (PAGINATE === 'keyset') {
          return {
            sortKey: (args) =>
              args.sortOnMain
                ? {
                    order: 'ASC',
                    key: ['created_at', 'id'],
                  }
                : null,
          };
        }
        return {
          resolve: (user, args) => {
            return connectionFromArray(user.following, args);
          },
        };
      })(),
      junction: {
        sqlTable: `(SELECT * FROM ${q('relationships', DB)})`,
        where: (table, args) =>
          args.intimacy
            ? `${table}.${q('closeness', DB)} = '${args.intimacy}'`
            : null,
        include: {
          friendship: {
            sqlColumn: 'closeness',
            jmIgnoreAll: false,
          },
          intimacy: {
            sqlExpr: (table) => `${table}.${q('closeness', DB)}`,
            jmIgnoreAll: false,
          },
          closeness: {
            sqlDeps: ['closeness'],
            jmIgnoreAll: false,
          },
        },
        ...(function() {
          if (PAGINATE === 'offset') {
            return {
              orderBy: (args) =>
                args.sortOnMain
                  ? null
                  : {
                      created_at: 'DESC',
                      followee_id: 'ASC',
                    },
            };
          }
          if (PAGINATE === 'keyset') {
            return {
              sortKey: (args) =>
                args.sortOnMain
                  ? null
                  : {
                      order: 'ASC',
                      key: ['created_at', 'followee_id'],
                    },
            };
          }
        })(),
        ...(function() {
          if (STRATEGY === 'batch' || STRATEGY === 'mix') {
            return {
              uniqueKey: ['follower_id', 'followee_id'],
              sqlBatch: {
                thisKey: 'follower_id',
                parentKey: 'id',
                sqlJoin: (relationTable, followeeTable) =>
                  `${relationTable}.${q(
                    'followee_id',
                    DB
                  )} = ${followeeTable}.${q('id', DB)}`,
              },
            };
          }
          return {
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
                )} = ${followeeTable}.${q('id', DB)}`,
            ],
          };
        })(),
      },
    },
    followingFirst: {
      type: new GraphQLList(User),
      limit: 1,
      orderBy: 'followee_id',
      junction: {
        sqlTable: q('relationships', DB),
        ...(function() {
          if (STRATEGY === 'batch' || STRATEGY === 'mix') {
            return {
              uniqueKey: ['follower_id', 'followee_id'],
              sqlBatch: {
                thisKey: 'follower_id',
                parentKey: 'id',
                sqlJoin: (relationTable, followeeTable) =>
                  `${relationTable}.${q(
                    'followee_id',
                    DB
                  )} = ${followeeTable}.${q('id', DB)}`,
              },
            };
          }
          return {
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
                )} = ${followeeTable}.${q('id', DB)}`,
            ],
          };
        })(),
      },
    },
    writtenMaterial: {
      type: AuthoredConnection,
      args: PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs,
      sqlPaginate: !!PAGINATE,
      ...(function() {
        if (PAGINATE === 'offset') {
          return {
            orderBy: {
              id: 'ASC',
              created_at: 'ASC',
            },
          };
        }

        if (PAGINATE === 'keyset') {
          return {
            sortKey: {
              order: 'ASC',
              key: ['id', 'created_at'],
            },
          };
        }

        return {
          orderBy: 'id',
          resolve: (user, args) => {
            return connectionFromArray(user.following, args);
          },
        };
      })(),
      ...(STRATEGY === 'batch'
        ? {
            sqlBatch: {
              thisKey: 'author_id',
              parentKey: 'id',
            },
          }
        : {
            sqlJoin: (userTable, unionTable) =>
              `${userTable}.${q('id', DB)} = ${unionTable}.${q(
                'author_id',
                DB
              )}`,
          }),
    },
    friendship: {
      type: GraphQLString,
      jmIgnoreAll: true,
    },
    intimacy: {
      type: GraphQLString,
      jmIgnoreAll: true,
    },
    closeness: {
      type: GraphQLString,
      jmIgnoreAll: true,
    },
    favNums: {
      type: new GraphQLList(GraphQLInt),
      resolve: () => [1, 2, 3],
    },
    numLegs: {
      description: 'How many legs this user has',
      type: GraphQLInt,
      sqlColumn: 'num_legs',
    },
    numFeet: {
      description: 'How many feet this user has',
      type: GraphQLInt,
      sqlDeps: ['num_legs'],
      resolve: (user) => user.num_legs,
    },
  }),
});

const connectionConfig = {nodeType: GraphQLNonNull(User)};
if (PAGINATE === 'offset') {
  connectionConfig.connectionFields = {
    total: {type: GraphQLInt},
  };
}
const {connectionType: UserConnection} = connectionDefinitions(
  connectionConfig
);

export {User, UserConnection};
