import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import User from './User'
import Comment from './Comment'

const { STRATEGY } = process.env

export default new GraphQLObjectType({
  description: 'A post from a user',
  name: 'Post',
  sqlTable: 'posts',
  uniqueKey: 'id',
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    body: {
      description: 'The content of the post',
      type: GraphQLString
    },
    authorId: {
      type: GraphQLInt,
      sqlColumn: 'author_id'
    },
    author: {
      description: 'The user that created the post',
      type: User,
      ...STRATEGY === 'batch' ?
        { sqlBatch:
          { thisKey: 'id',
            parentKey: 'author_id' } } :
        { sqlJoin: (postTable, userTable) => `${postTable}.author_id = ${userTable}.id` }
    },
    comments: {
      description: 'The comments on this post',
      type: new GraphQLList(Comment),
      args: {
        active: { type: GraphQLBoolean },
        asc: { type: GraphQLBoolean }
      },
      orderBy: args => ({ id: args.asc ? 'asc' : 'desc' }),
      ...[ 'batch', 'mix' ].includes(STRATEGY) ?
        { sqlBatch:
          { thisKey: 'post_id',
            parentKey: 'id' },
          where: (table, args) => args.active ? `${table}.archived = (0 = 1)` : null } :
        { sqlJoin: (postTable, commentTable, args) => `${commentTable}.post_id = ${postTable}.id ${args.active ? `AND ${commentTable}.archived = (0 = 1)` : ''}` }
    },
    numComments: {
      description: 'How many comments this post has',
      type: GraphQLInt,
      // you can info from a correlated subquery
      sqlExpr: table => `(SELECT count(*) from comments where ${table}.id = comments.post_id)`
    },
    archived: {
      type: GraphQLBoolean
    }
  })
})

