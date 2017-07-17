import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import {
  globalIdField,
  connectionDefinitions,
  connectionFromArray,
  connectionArgs,
  forwardConnectionArgs
} from 'graphql-relay'

import { User } from './User'
import { CommentConnection } from './Comment'
import { Authored } from './Authored/Interface'
import { nodeInterface } from './Node'
import { q, bool } from '../shared'

const { PAGINATE, STRATEGY, DB } = process.env

export const Post = new GraphQLObjectType({
  description: 'A post from a user',
  name: 'Post',
  sqlTable: `(SELECT * FROM ${q('posts', DB)})`,
  uniqueKey: 'id',
  interfaces: () => [ nodeInterface, Authored ],
  fields: () => ({
    id: {
      ...globalIdField(),
      sqlDeps: [ 'id' ]
    },
    body: {
      description: 'The content of the post',
      type: GraphQLString
    },
    authorId: {
      type: GraphQLInt,
      sqlColumn: 'author_id'
    },
    author: {
      description: 'The user that created the post',
      type: User,
      ...STRATEGY === 'batch' ? {
        sqlBatch: {
          thisKey: 'id',
          parentKey: 'author_id'
        }
      } : {
        sqlJoin: (postTable, userTable) => `${postTable}.${q('author_id', DB)} = ${userTable}.${q('id', DB)}`
      }
    },
    comments: {
      description: 'The comments on this post',
      type: CommentConnection,
      args: {
        active: { type: GraphQLBoolean },
        ...PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs
      },
      sqlPaginate: !!PAGINATE,
      ... do {
        if (PAGINATE === 'offset') {
          ({ orderBy: 'id' })
        } else if (PAGINATE === 'keyset') {
          ({
            sortKey: {
              order: 'DESC',
              key: 'id'
            }
          })
        } else {
          ({
            resolve: (user, args) => {
              user.comments.sort((a, b) => a.id - b.id)
              return connectionFromArray(user.comments, args)
            }
          })
        }
      },
      ... do {
        if (STRATEGY === 'batch' || STRATEGY === 'mix') {
          ({
            sqlBatch: {
              thisKey: 'post_id',
              parentKey: 'id'
            },
            where: (table, args) => args.active ? `${table}.${q('archived', DB)} = ${bool(false, DB)}` : null
          })
        } else {
          ({
            sqlJoin: (postTable, commentTable, args) => `${commentTable}.${q('post_id', DB)} = ${postTable}.${q('id', DB)} ${args.active ? `AND ${commentTable}.${q('archived', DB)} = ${bool(false, DB)}` : ''}` 
          })
        }
      }
    },
    numComments: {
      description: 'How many comments this post has',
      type: GraphQLInt,
      // you can info from a correlated subquery
      sqlExpr: table => `(SELECT count(*) from ${q('comments', DB)} WHERE ${table}.${q('id', DB)} = comments.${q('post_id', DB)})`
    },
    archived: {
      type: GraphQLBoolean
    },
    createdAt: {
      type: GraphQLString,
      sqlColumn: 'created_at'
    }
  })
})

const connectionConfig = { nodeType: Post }
if (PAGINATE === 'offset') {
  connectionConfig.connectionFields = {
    total: { type: GraphQLInt }
  }
}
const { connectionType: PostConnection } = connectionDefinitions(connectionConfig)
export { PostConnection }

