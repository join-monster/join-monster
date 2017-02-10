import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import {
  globalIdField,
  connectionDefinitions,
  connectionFromArray,
  forwardConnectionArgs
} from 'graphql-relay'

import { User } from './User'
import { CommentConnection } from './Comment'
import { nodeInterface } from './Node'


export const Post = new GraphQLObjectType({
  description: 'A post from a user',
  name: 'Post',
  sqlTable: 'posts',
  uniqueKey: 'id',
  interfaces: [ nodeInterface ],
  fields: () => ({
    id: {
      ...globalIdField(),
      sqlDeps: [ 'id' ]
    },
    body: {
      description: 'The content of the post',
      type: GraphQLString
    },
    author: {
      description: 'The user that created the post',
      type: User,
      sqlJoin: (postTable, userTable) => `${postTable}.author_id = ${userTable}.id`
    },
    comments: {
      description: 'The comments on this post',
      type: CommentConnection,
      args: {
        ...forwardConnectionArgs,
        active: { type: GraphQLBoolean }
      },
      sqlPaginate: !!process.env.PAGINATE,
      ...process.env.PAGINATE === 'offset' ?
        { orderBy: 'id' } :
        process.env.PAGINATE === 'keyset' ?
          { sortKey:
            { order: 'DESC',
              key: 'id' } } :
          {
            resolve: (user, args) => {
              user.comments.sort((a, b) => a.id - b.id)
              return connectionFromArray(user.comments, args)
            }
          },
      ...[ 'batch', 'mix' ].includes(process.env.STRATEGY) ?
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

const { connectionType: PostConnection } = connectionDefinitions({ nodeType: Post })
export { PostConnection }

