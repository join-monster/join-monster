import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import {
  globalIdField,
  forwardConnectionArgs,
  connectionDefinitions
} from 'graphql-relay'

import { PostConnection } from './Post'
import { CommentConnection } from './Comment'
import { nodeInterface } from './Node'


const User = new GraphQLObjectType({
  description: 'a stem contract account',
  name: 'User',
  sqlTable: 'accounts',
  uniqueKey: 'id',
  interfaces: [ nodeInterface ],
  fields: () => ({
    id: {
      description: 'The global ID for the Relay spec',
      ...globalIdField('User'),
      sqlDeps: [ 'id' ]
    },
    email: {
      type: GraphQLString,
      sqlColumn: 'email_address'
    },
    fullName: {
      description: 'A user\'s first and last name',
      type: GraphQLString,
      sqlDeps: [ 'first_name', 'last_name' ],
      resolve: user => `${user.first_name} ${user.last_name}`
    },
    comments: {
      description: 'Comments the user has written on people\'s posts',
      type: CommentConnection,
      args: forwardConnectionArgs,
      sqlPaginate: true,
      orderBy: 'id',
      sqlJoin: (userTable, commentTable) => `${userTable}.id = ${commentTable}.author_id`
    },
    posts: {
      description: 'A list of Posts the user has written',
      type: PostConnection, 
      args: forwardConnectionArgs,
      sqlPaginate: true,
      orderBy: {
        created_at: 'desc',
        id: 'asc'
      },
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

const { connectionType: UserConnection } = connectionDefinitions({ nodeType: User })

export { User, UserConnection }

