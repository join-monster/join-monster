import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import User from './User'
import Comment from './Comment'

export default new GraphQLObjectType({
  description: 'A post from a user',
  name: 'Post',
  sqlTable: 'posts',
  uniqueKey: 'id',
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
      sqlColumn: 'author_id'
    },
    author: {
      description: 'The user that created the post',
      type: User,
      sqlBatch: {
        thisKey: 'id',
        parentKey: 'author_id'
      }
    },
    comments: {
      description: 'The comments on this post',
      type: new GraphQLList(Comment),
      sqlBatch: {
        thisKey: 'post_id',
        parentKey: 'id'
      }
    }
  })
})
