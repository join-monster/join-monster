import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLBoolean
} from 'graphql'

import Post from './Post'
import User from './User'
import { q } from '../shared'
import Authored from './Authored/Interface'

const { STRATEGY, DB } = process.env

export default new GraphQLObjectType({
  description: 'Comments on posts',
  name: 'Comment',
  extensions: {
    joinMonster: {
      sqlTable: q('comments', DB),
      uniqueKey: 'id'
    }
  },
  interfaces: () => [Authored],
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    body: {
      description: 'The content of the comment',
      type: GraphQLString
    },
    postId: {
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          sqlColumn: 'post_id'
        }
      }
    },
    post: {
      description: 'The post that the comment belongs to',
      type: Post,
      extensions: {
        joinMonster: {
          ...(STRATEGY === 'batch'
            ? {
                sqlBatch: {
                  thisKey: 'id',
                  parentKey: 'post_id'
                }
              }
            : {
                sqlJoin: (commentTable, postTable) =>
                  `${commentTable}.${q('post_id', DB)} = ${postTable}.${q(
                    'id',
                    DB
                  )}`
              })
        }
      }
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
      description: 'The user who wrote the comment',
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
                sqlJoin: (commentTable, userTable) =>
                  `${commentTable}.${q('author_id', DB)} = ${userTable}.${q(
                    'id',
                    DB
                  )}`
              })
        }
      }
    },
    likers: {
      description: 'Which users have liked this comment',
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          junction: {
            sqlTable: q('likes', DB),
            sqlJoins: [
              (commentTable, likesTable) =>
                `${commentTable}.${q('id', DB)} = ${likesTable}.${q(
                  'comment_id',
                  DB
                )}`,
              (likesTable, userTable) =>
                `${likesTable}.${q('account_id', DB)} = ${userTable}.${q(
                  'id',
                  DB
                )}`
            ]
          }
        }
      }
    },
    archived: {
      type: GraphQLBoolean
    },
    createdAt: {
      description: 'When this was created',
      type: GraphQLString,
      extensions: {
        joinMonster: {
          sqlColumn: 'created_at'
        }
      }
    }
  })
})
