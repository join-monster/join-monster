import {GraphQLObjectType, GraphQLString, GraphQLInt} from 'graphql';

const Sponsor = new GraphQLObjectType({
  description: 'people who have given money',
  name: 'Sponsor',
  sqlTable: '"sponsors"',
  uniqueKey: ['generation', 'first_name', 'last_name'],
  fields: () => ({
    firstName: {
      type: GraphQLString,
      sqlColumn: 'first_name',
    },
    lastName: {
      type: GraphQLString,
      sqlColumn: 'last_name',
    },
    generation: {
      type: GraphQLInt,
    },
    numLegs: {
      description: 'How many legs this user has',
      type: GraphQLInt,
      sqlColumn: 'num_legs',
    },
    numFeet: {
      description: 'How many feet this user has',
      type: GraphQLInt,
      sqlDeps: ['num_legs'],
      resolve: (user) => user.num_legs,
    },
  }),
});

export default Sponsor;
