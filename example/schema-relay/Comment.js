import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import { globalIdField } from 'graphql-relay'

import Post from './Post'
import User from './User'
import { getNode } from './Node'

export default new GraphQLObjectType({
  description: 'Comments on posts',
  name: 'Comment',
  sqlTable: 'comments',
  uniqueKey: 'id',
  interfaces: () => [ getNode().nodeInterface ],
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
    }
  })
})
