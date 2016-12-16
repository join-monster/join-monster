import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import {
  globalIdField
} from 'graphql-relay'

import Comment from './Comment'
import Post from './Post'
import { toBase64 } from './utils'

const User = new GraphQLObjectType({
  description: 'a stem contract account',
  name: 'User',
  sqlTable: 'accounts',
  uniqueKey: 'id',
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    email: {
      type: GraphQLString,
      sqlColumn: 'email_address'
    },
    idEncoded: {
      description: 'The ID base-64 encoded',
      type: GraphQLString,
      sqlColumn: 'id',
      resolve: user => toBase64(user.idEncoded)
    },
    globalId: {
      description: 'The global ID for the Relay spec',
      ...globalIdField('User'),
      sqlDeps: [ 'id' ]
    },
    fullName: {
      description: 'A user\'s first and last name',
      type: GraphQLString,
      sqlDeps: [ 'first_name', 'last_name' ],
      resolve: user => `${user.first_name} ${user.last_name}`
    },
    capitalizedLastName: {
      description: 'The last name WITH CAPS LOCK',
      type: GraphQLString,
      sqlExpr: (table, args, context) => `upper(${table}.last_name)`
    },
    comments: {
      description: 'Comments the user has written on people\'s posts',
      type: new GraphQLList(Comment),
      sqlJoin: (userTable, commentTable) => `${userTable}.id = ${commentTable}.author_id`
    },
    posts: {
      description: 'A list of Posts the user has written',
      type: new GraphQLList(Post),
      sqlJoin: (userTable, postTable) => `${userTable}.id = ${postTable}.author_id`
    },
    following: {
      description: 'Users that this user is following',
      type: new GraphQLList(User),
      joinTable: 'relationships',
      sqlJoins: [
        (followerTable, relationTable) => `${followerTable}.id = ${relationTable}.follower_id`,
        (relationTable, followeeTable) => `${relationTable}.followee_id = ${followeeTable}.id`
      ]
    },
    favNums: {
      type: new GraphQLList(GraphQLInt),
      resolve: () => [1, 2, 3]
    },
    numLegs: {
      description: 'How many legs this user has',
      type: GraphQLInt,
      sqlColumn: 'num_legs'
    },
    numFeet: {
      description: 'How many feet this user has',
      type: GraphQLInt,
      sqlDeps: [ 'num_legs' ],
      resolve: user => user.num_legs
    }
  })
})

export default User 
