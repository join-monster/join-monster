import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString
} from 'graphql'

import {
  globalIdField,
} from 'graphql-relay'

import User from './User'
import Comment from './Comment'
import { getNode } from './Node'


export default new GraphQLObjectType({
  description: 'A post from a user',
  name: 'Post',
  sqlTable: 'posts',
  uniqueKey: 'id',
  interfaces: () => [ getNode().nodeInterface ],
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
      type: new GraphQLList(Comment),
      sqlJoin: (postTable, commentTable) => `${postTable}.id = ${commentTable}.post_id`
    }
  })
})
