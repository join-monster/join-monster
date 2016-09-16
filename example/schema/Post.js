import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt
} from 'graphql'

export default new GraphQLObjectType({
  description: 'A post from a user',
  name: 'Post',
  sqlTable: 'posts',
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    body: {
      description: 'The content of the post',
      type: GraphQLString
    }
  })
})
