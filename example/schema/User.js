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

export default new GraphQLObjectType({
  description: 'a stem contract account',
  name: 'User',
  sqlTable: 'accounts',
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
      resolve: user => toBase64(user.id)
    },
    globalId: {
      description: 'The global ID for the Relay spec',
      ...globalIdField(),
      sqlColumn: 'id'
    },
    full_name: {
      description: 'A user\'s first and last name',
      type: GraphQLString,
      sqlDeps: [ 'first_name', 'last_name' ],
      resolve: user => `${user.first_name} ${user.last_name}`
    },
    comments: {
      description: 'Comments the user has written on people\'s posts',
      type: new GraphQLList(Comment),
      sqlJoin: (userTable, commentTable) => `${userTable}.id = ${commentTable}.author_id`
    }
  })
})

function toBase64(clear) {
  return Buffer.from(String(clear)).toString('base64')
}
