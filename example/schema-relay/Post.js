import {
  GraphQLObjectType,
  GraphQLString
} from 'graphql'

import {
  globalIdField,
  connectionDefinitions,
  connectionArgs,
  connectionFromArray
} from 'graphql-relay'

import User from './User'
import { CommentConnection } from './Comment'
import { nodeInterface } from './Node'


export const Post = new GraphQLObjectType({
  description: 'A post from a user',
  name: 'Post',
  sqlTable: 'posts',
  uniqueKey: 'id',
  interfaces: [ nodeInterface ],
  fields: () => ({
    id: {
      ...globalIdField(),
      sqlDeps: [ 'id' ]
    },
    body: {
      description: 'The content of the post',
      type: GraphQLString
    },
    author: {
      description: 'The user that created the post',
      type: User,
      sqlJoin: (postTable, userTable) => `${postTable}.author_id = ${userTable}.id`
    },
    comments: {
      description: 'The comments on this post',
      type: CommentConnection,
      args: connectionArgs,
      resolve: (post, args) => {
        return connectionFromArray(post.comments, args)
      },
      sqlJoin: (postTable, commentTable) => `${postTable}.id = ${commentTable}.post_id`
    }
  })
})

const { connectionType: PostConnection } = connectionDefinitions({ nodeType: Post })
export { PostConnection }

