import { GraphQLEnumType } from 'graphql'

export default new GraphQLEnumType({
  name: 'IntimacyLevel',
  values: {
    best: { value: 'best' },
    acquaintance: { value: 'acquaintance' }
  }
})
