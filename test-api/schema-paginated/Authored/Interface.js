import {
  GraphQLInterfaceType,
  GraphQLID,
  GraphQLInt,
  GraphQLString
} from 'graphql'

import { connectionDefinitions } from 'graphql-relay'

import { q } from '../../shared'

const { DB, PAGINATE } = process.env

export const Authored = new GraphQLInterfaceType({
  name: 'AuthoredInterface',
  extensions: {
    joinMonster: {
      sqlTable: `(
      SELECT
        ${q('id', DB)},
        ${q('body', DB)},
        ${q('author_id', DB)},
        NULL AS ${q('post_id', DB)},
        ${q('created_at', DB)},
        'Post' AS ${q('$type', DB)}
      FROM ${q('posts', DB)}
      UNION ALL
      SELECT
        ${q('id', DB)},
        ${q('body', DB)},
        ${q('author_id', DB)},
        ${q('post_id', DB)},
        ${q('created_at', DB)},
        'Comment' AS ${q('$type', DB)}
      FROM ${q('comments', DB)}
    )`,
      uniqueKey: ['id', '$type'],
      alwaysFetch: '$type'
    }
  },
  fields: () => ({
    id: {
      type: GraphQLID
    },
    body: {
      type: GraphQLString
    },
    authorId: {
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          sqlColumn: 'author_id'
        }
      }
    }
  }),
  resolveType: obj => obj.$type
})

const connectionConfig = { nodeType: Authored }
if (PAGINATE === 'offset') {
  connectionConfig.connectionFields = {
    total: { type: GraphQLInt }
  }
}
const { connectionType: AuthoredConnection } = connectionDefinitions(
  connectionConfig
)
export { AuthoredConnection }
