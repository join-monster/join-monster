import { GraphQLObjectType, GraphQLString, GraphQLInt } from 'graphql'

const Sponsor = new GraphQLObjectType({
  description: 'people who have given money',
  name: 'Sponsor',
  extensions: {
    joinMonster: {
      sqlTable: '"sponsors"',
      uniqueKey: ['generation', 'first_name', 'last_name']
    }
  },
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
        },
        resolve: user => user.num_legs
      }
    }
  })
})

export default Sponsor
