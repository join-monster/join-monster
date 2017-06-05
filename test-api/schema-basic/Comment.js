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
  sqlTable: q('comments', DB),
  uniqueKey: 'id',
  interfaces: () => [ Authored ],
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
      sqlColumn: 'post_id'
    },
    post: {
      description: 'The post that the comment belongs to',
      type: Post,
      ...STRATEGY === 'batch' ? {
        sqlBatch: {
          thisKey: 'id',
          parentKey: 'post_id'
        }
      } : {
        sqlJoin: (commentTable, postTable) => `${commentTable}.${q('post_id', DB)} = ${postTable}.${q('id', DB)}`
      }
    },
    authorId: {
      type: GraphQLInt,
      sqlColumn: 'author_id'
    },
    author: {
      description: 'The user who wrote the comment',
      type: User,
      ...STRATEGY === 'batch' ? {
        sqlBatch: {
          thisKey: 'id',
          parentKey: 'author_id'
        }
      } : {
        sqlJoin: (commentTable, userTable) => `${commentTable}.${q('author_id', DB)} = ${userTable}.${q('id', DB)}`
      }
    },
    likers: {
      description: 'Which users have liked this comment',
      type: new GraphQLList(User),
      junction: {
        sqlTable: q('likes', DB),
        sqlJoins: [
          (commentTable, likesTable) => `${commentTable}.${q('id', DB)} = ${likesTable}.${q('comment_id', DB)}`,
          (likesTable, userTable) => `${likesTable}.${q('account_id', DB)} = ${userTable}.${q('id', DB)}`
        ]
      }
    },
    archived: {
      type: GraphQLBoolean
    },
    createdAt: {
      description: 'When this was created',
      type: GraphQLString,
      sqlColumn: 'created_at'
    }
  })
})

