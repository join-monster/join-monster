import { GraphQLObjectType, GraphQLString, GraphQLInt } from 'graphql'

import Person from './Person'
import { q } from '../shared'

const { DB } = process.env

const Sponsor = new GraphQLObjectType({
  description: 'people who have given money',
  name: 'Sponsor',
  extensions: {
    joinMonster: {
      sqlTable: q('sponsors', DB),
      uniqueKey: ['generation', 'first_name', 'last_name']
    }
  },
  interfaces: [Person],
  fields: () => ({
    firstName: {
      type: GraphQLString,
      extensions: {
        joinMonster: {
          sqlColumn: 'first_name'
        }
      }
    },
    lastName: {
      type: GraphQLString,
      extensions: {
        joinMonster: {
          sqlColumn: 'last_name'
        }
      }
    },
    fullName: {
      type: GraphQLString,
      extensions: {
        joinMonster: {
          sqlDeps: ['first_name', 'last_name']
        }
      },
      resolve: sponsor => `${sponsor.first_name} ${sponsor.last_name}`
    },
    generation: {
      type: GraphQLInt
    },
    numLegs: {
      description: 'How many legs this user has',
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          sqlColumn: 'num_legs'
        }
      }
    },
    numFeet: {
      description: 'How many feet this user has',
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          sqlDeps: ['num_legs']
        }
      },
      resolve: user => user.num_legs
    }
  })
})

export default Sponsor
