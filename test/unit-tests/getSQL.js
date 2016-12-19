import test from 'ava'
import { buildResolveInfo } from '../_util'
import joinMonster from '../../src/index'


test('getSQL method generates a SQL query', async t => {
  const query = `
    {
      user(id: 1) {
        fullName
        numFeet
        following {
          fullName
        }
        posts {
          body
          comments {
            body
          }
        }
      }
    }
  `
  const expectedSQL = `\
SELECT
  "user"."id" AS "id",
  "following"."id" AS "following__id",
  "following"."first_name" AS "following__first_name",
  "following"."last_name" AS "following__last_name",
  "posts"."id" AS "posts__id",
  "posts"."body" AS "posts__body",
  "comments"."id" AS "posts__comments__id",
  "comments"."body" AS "posts__comments__body",
  "user"."num_legs" AS "num_legs",
  "user"."first_name" AS "first_name",
  "user"."last_name" AS "last_name"
FROM accounts AS "user"
LEFT JOIN relationships AS "relationships" ON "user".id = "relationships".follower_id
LEFT JOIN accounts AS "following" ON "relationships".followee_id = "following".id
LEFT JOIN posts AS "posts" ON "user".id = "posts".author_id
LEFT JOIN comments AS "comments" ON "posts".id = "comments".post_id
WHERE "user".id = 1`
  const resolveInfo = await buildResolveInfo(query)
  const sql = await joinMonster.getSQL(resolveInfo, {})
  t.is(sql, expectedSQL)
})
