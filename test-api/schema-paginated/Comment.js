import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import { globalIdField, connectionDefinitions } from 'graphql-relay'

import { Post } from './Post'
import { User } from './User'
import { Authored } from './Authored/Interface'
import { nodeInterface } from './Node'
import { q } from '../shared'

const { PAGINATE, DB } = process.env

export const Comment = new GraphQLObjectType({
  description: 'Comments on posts',
  name: 'Comment',
  extensions: {
    joinMonster: {
      sqlTable: `(SELECT * FROM ${q('comments', DB)})`,
      uniqueKey: 'id'
    }
  },
  interfaces: () => [nodeInterface, Authored],
  fields: () => ({
    id: {
      ...globalIdField(),
      extensions: {
        joinMonster: {
          sqlDeps: ['id']
        }
      }
    },
    body: {
      description: 'The content of the comment',
      type: GraphQLString
    },
    post: {
      description: 'The post that the comment belongs to',
      type: Post,
      extensions: {
        joinMonster: {
          sqlJoin: (commentTable, postTable) =>
            `${commentTable}.${q('post_id', DB)} = ${postTable}.${q('id', DB)}`
        }
      }
    },
    authorId: {
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          sqlColumn: 'author_id'
        }
      }
    },
    author: {
      description: 'The user who wrote the comment',
      type: User,
      extensions: {
        joinMonster: {
          sqlJoin: (commentTable, userTable) =>
            `${commentTable}.${q('author_id', DB)} = ${userTable}.${q(
              'id',
              DB
            )}`
        }
      }
    },
    archived: {
      type: GraphQLBoolean
    },
    likers: {
      description: 'Which users have liked this comment',
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          junction: {
            sqlTable: 'likes',
            sqlJoins: [
              (commentTable, likesTable) =>
                `${commentTable}.${q('id', DB)} = ${likesTable}.${q(
                  'comment_id',
                  DB
                )}`,
              (likesTable, userTable) =>
                `${likesTable}.${q('account_id', DB)} = ${userTable}.${q(
                  'id',
                  DB
                )}`
            ]
          }
        }
      }
    },
    createdAt: {
      description: 'When this was created',
      type: GraphQLString,
      extensions: {
        joinMonster: {
          sqlColumn: 'created_at'
        }
      }
    }
  })
})

const connectionConfig = { nodeType: Comment }
if (PAGINATE === 'offset') {
  connectionConfig.connectionFields = {
    total: { type: GraphQLInt }
  }
}
const { connectionType: CommentConnection } = connectionDefinitions(
  connectionConfig
)
export { CommentConnection }
