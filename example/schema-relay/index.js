import { GraphQLSchema } from 'graphql'
import User from './User'

import QueryRoot from './QueryRoot'

export default new GraphQLSchema({
  types: [ User ],
  description: 'a test schema',
  query: QueryRoot
})

