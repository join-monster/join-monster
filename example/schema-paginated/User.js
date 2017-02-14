import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import {
  globalIdField,
  connectionArgs,
  connectionDefinitions,
  connectionFromArray
} from 'graphql-relay'

import { PostConnection } from './Post'
import { CommentConnection } from './Comment'
import { nodeInterface } from './Node'

const { PAGINATE, STRATEGY } = process.env

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
      args: {
        ...connectionArgs,
        active: { type: GraphQLBoolean }
      },
      sqlPaginate: !!PAGINATE,
      ... do {
        if (PAGINATE === 'offset') {
          ({ orderBy: 'id' })
        } else if (PAGINATE === 'keyset') {
          ({
            sortKey: {
              order: 'desc',
              key: 'id'
            }
          })
        } else {
          ({
            resolve: (user, args) => {
              user.comments.sort((a, b) => a.id - b.id)
              return connectionFromArray(user.comments, args)
            }
          })
        }
      },
      ... do {
        if (STRATEGY === 'batch' || STRATEGY === 'mix') {
          ({
            sqlBatch: {
              thisKey: 'author_id',
              parentKey: 'id'
            },
            where: (table, args) => args.active ? `${table}.archived = (0 = 1)` : null 
          })
        } else {
          ({
            sqlJoin: (userTable, commentTable, args) => `${commentTable}.author_id = ${userTable}.id ${args.active ? `AND ${commentTable}.archived = (0 = 1)` : ''}`
          })
        }
      }
    },
    posts: {
      description: 'A list of Posts the user has written',
      type: PostConnection, 
      args: {
        ...connectionArgs,
        search: { type: GraphQLString }
      },
      sqlPaginate: !!PAGINATE,
      ... do {
        if (PAGINATE === 'offset') {
          ({
            orderBy: args => ({ // eslint-disable-line no-unused-vars
              created_at: 'desc',
              id: 'asc'
            })
          })
        } else if (PAGINATE === 'keyset') {
          ({
            sortKey: args => ({ // eslint-disable-line no-unused-vars
              order: 'desc',
              key: [ 'created_at', 'id' ]
            })
          })
        } else {
          ({
            resolve: (user, args) => {
              user.posts.sort((a, b) => a.id - b.id)
              return connectionFromArray(user.posts, args)
            }
          })
        }
      },
      where: (table, args) => {
        if (args.search) return `${table}.body ilike '%${args.search}%'`
      },
      ... do {
        if (STRATEGY === 'batch') {
          ({
            sqlBatch: {
              thisKey: 'author_id',
              parentKey: 'id'
            }
          })
        } else {
          ({
            sqlJoin: (userTable, postTable) => `${postTable}.author_id = ${userTable}.id`
          })
        }
      }
    },
    following: {
      description: 'Users that this user is following',
      type: UserConnection,
      args: connectionArgs,
      junctionTable: 'relationships',
      sqlPaginate: !!PAGINATE,
      ... do {
        if (PAGINATE === 'offset') {
          ({
            orderBy: {
              created_at: 'DESC',
              followee_id: 'ASC'
            }
          })
        } else if (PAGINATE === 'keyset') {
          ({
            sortKey: {
              order: 'ASC',
              key: [ 'created_at', 'followee_id' ]
            }
          })
        } else {
          ({
            resolve: (user, args) => {
              return connectionFromArray(user.following, args)
            }
          })
        }
      },
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

