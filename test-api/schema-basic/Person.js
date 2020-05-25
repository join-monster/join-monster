import { GraphQLInterfaceType, GraphQLString } from 'graphql'

const Person = new GraphQLInterfaceType({
  name: 'Person',
  resolveType: (value, info) => {
    if (
      'email' in value ||
      'posts' in value ||
      'following' in value ||
      'comments' in value
    ) {
      return info.schema.getType('User')
    } else {
      return info.schema.getType('Sponsor')
    }
  },
  fields: {
    fullName: {
      type: GraphQLString
    }
  }
})

export default Person
