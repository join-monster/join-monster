import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import User from './User'

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
    author: {
      description: 'The user that created the post',
      type: User,
      sqlJoin: (postTable, userTable) => `${postTable}.author_id = ${userTable}.id`
    }
  })
})
