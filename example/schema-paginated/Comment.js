import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean
} from 'graphql'

import {
  globalIdField,
  connectionDefinitions
} from 'graphql-relay'

import { Post } from './Post'
import { User } from './User'
import { nodeInterface } from './Node'

export const Comment = new GraphQLObjectType({
  description: 'Comments on posts',
  name: 'Comment',
  sqlTable: 'comments',
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
      sqlJoin: (commentTable, postTable) => `${commentTable}.post_id = ${postTable}.id`
    },
    author: {
      description: 'The user who wrote the comment',
      type: User,
      sqlJoin: (commentTable, userTable) => `${commentTable}.author_id = ${userTable}.id`
    },
    archived: {
      type: GraphQLBoolean
    },
    likers: {
      description: 'Which users have liked this comment',
      junctionTable: 'likes',
      type: new GraphQLList(User),
      sqlJoins: [
        (commentTable, likesTable) => `${commentTable}.id = ${likesTable}.comment_id`,
        (likesTable, userTable) => `${likesTable}.account_id = ${userTable}.id`
      ]
    },
    createdAt: {
      description: 'When this was created',
      type: GraphQLString,
      sqlColumn: 'created_at'
    }
  })
})

const { connectionType: CommentConnection } = connectionDefinitions({ nodeType: Comment })
export { CommentConnection }

