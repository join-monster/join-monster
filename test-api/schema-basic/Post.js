import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import User from './User'
import Comment from './Comment'
import { q, bool } from '../shared'
import Authored from './Authored/Interface'

const { STRATEGY, DB } = process.env

export default new GraphQLObjectType({
  description: 'A post from a user',
  name: 'Post',
  extensions: {
    joinMonster: {
      sqlTable: q('posts', DB),
      uniqueKey: 'id'
    }
  },
  interfaces: () => [Authored],
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    body: {
      description: 'The content of the post',
      type: GraphQLString
    },
    authorId: {
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          sqlColumn: 'author_id'
        }
      }
    },
    author: {
      description: 'The user that created the post',
      type: User,
      extensions: {
        joinMonster: {
          ...(STRATEGY === 'batch'
            ? {
                sqlBatch: {
                  thisKey: 'id',
                  parentKey: 'author_id'
                }
              }
            : {
                sqlJoin: (postTable, userTable) =>
                  `${postTable}.${q('author_id', DB)} = ${userTable}.${q(
                    'id',
                    DB
                  )}`
              })
        }
      }
    },
    comments: {
      description: 'The comments on this post',
      type: new GraphQLList(Comment),
      args: {
        active: { type: GraphQLBoolean },
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
                where: (table, args) =>
                  args.active
                    ? `${table}.${q('archived', DB)} = ${bool(false, DB)}`
                    : null
              }
            : {
                sqlJoin: (postTable, commentTable, args) =>
                  `${commentTable}.${q('post_id', DB)} = ${postTable}.${q(
                    'id',
                    DB
                  )} ${
                    args.active
                      ? `AND ${commentTable}.${q('archived', DB)} = ${bool(
                          false,
                          DB
                        )}`
                      : ''
                  }`
              })
        }
      }
    },
    numComments: {
      description: 'How many comments this post has',
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          // you can info from a correlated subquery
          sqlExpr: table =>
            `(SELECT count(*) from ${q('comments', DB)} WHERE ${table}.${q(
              'id',
              DB
            )} = ${q('comments', DB)}.${q('post_id', DB)})`
        }
      }
    },
    archived: {
      type: GraphQLBoolean
    }
  })
})
