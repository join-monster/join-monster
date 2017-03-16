import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import {
  globalIdField,
  connectionDefinitions
} from 'graphql-relay'

import { Post } from './Post'
import { User } from './User'
import { nodeInterface } from './Node'
import { q } from '../shared'

const { PAGINATE, DB } = process.env

export const Comment = new GraphQLObjectType({
  description: 'Comments on posts',
  name: 'Comment',
  //sqlTable: q('comments', DB),
  sqlTable: `(SELECT * FROM ${q('comments', DB)})`,
  uniqueKey: 'id',
  interfaces: [ nodeInterface ],
  fields: () => ({
    id: {
      ...globalIdField(),
      sqlDeps: [ 'id' ]
    },
    body: {
      description: 'The content of the comment',
      type: GraphQLString
    },
    post: {
      description: 'The post that the comment belongs to',
      type: Post,
      sqlJoin: (commentTable, postTable) => `${commentTable}.${q('post_id', DB)} = ${postTable}.${q('id', DB)}`
    },
    author: {
      description: 'The user who wrote the comment',
      type: User,
      sqlJoin: (commentTable, userTable) => `${commentTable}.${q('author_id', DB)} = ${userTable}.${q('id', DB)}`
    },
    archived: {
      type: GraphQLBoolean
    },
    likers: {
      description: 'Which users have liked this comment',
      junctionTable: 'likes',
      type: new GraphQLList(User),
      sqlJoins: [
        (commentTable, likesTable) => `${commentTable}.${q('id', DB)} = ${likesTable}.${q('comment_id', DB)}`,
        (likesTable, userTable) => `${likesTable}.${q('account_id', DB)} = ${userTable}.${q('id', DB)}`
      ]
    },
    createdAt: {
      description: 'When this was created',
      type: GraphQLString,
      sqlColumn: 'created_at'
    }
  })
})

const connectionConfig = { nodeType: Comment }
if (PAGINATE === 'offset') {
  connectionConfig.connectionFields = {
    total: { type: GraphQLInt }
  }
}
const { connectionType: CommentConnection } = connectionDefinitions(connectionConfig)
export { CommentConnection }

