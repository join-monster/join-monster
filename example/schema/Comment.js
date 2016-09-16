import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import Post from './Post'

export default new GraphQLObjectType({
  description: 'Comments on posts',
  name: 'Comment',
  sqlTable: 'comments',
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    body: {
      descritpion: 'The content of the comment',
      type: GraphQLString
    },
    post: {
      description: 'The post that the comment belongs to',
      type: Post,
      sqlJoin: (commentTable, postTable) => `${commentTable}.post_id = ${postTable}.id`
    }
  })
})
