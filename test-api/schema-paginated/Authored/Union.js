import { GraphQLUnionType } from 'graphql'

import Comment from '../Comment'
import Post from '../Post'
import { q } from '../../shared'

const { DB } = process.env

export default new GraphQLUnionType({
  name: 'AuthoredUnion',
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
  types: () => [Comment, Post],
  resolveType: obj => obj.$type
})
