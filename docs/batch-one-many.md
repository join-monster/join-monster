## Introducing an Additional Batch to the Query Plan

Let's go back to the `Post` and use this new strategy.
Instead of using a `JOIN` to get the comments, we'll run it in a separate batch.
Join Monster uses the `sqlBatch` property for this. It's an object the requires `thisKey` and `parentKey`.
These are the columns for which the values must match between the tables.
In this case, the value of the `post_id` column in the `comments` table must match the `id` column in the `posts` table.

```javascript
const Post = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    comments: {
      description: 'The comments on this post',
      type: new GraphQLList(Comment),
      extensions: {
        joinMonster: {
          // instead of doing yet another JOIN, we'll get these comments in a separate batch
          // sqlJoin: (postTable, commentTable) => `${postTable}.id = ${commentTable}.post_id AND ${commentTable}.archived = FALSE`,
          sqlBatch: {
            // which column to match up to the users
            thisKey: 'post_id',
            // the other column to compare to
            parentKey: 'id'
          },
          // sqlBatch works with the `where` function too. get only non-archived comments
          where: table => `${table}.archived = FALSE`
        }
      }
    }
  })
})
```

## The New Query Plan

Now the `Comment` and all its children are fetched in a separate batch. This plan now has 2 database queries rather than 1.

![query-plan-2](img/query-plan-2.png)

Join Monster looks at the `'id'` in each `Post` and uses `WHERE IN` to know which comments to get in the subsequent query.
It will "join" these results together by matching on the values in those columns in the application layer.

So a query like this:

```graphql
{
  user(id: 2) {
    fullName
    email
    posts {
      id
      body
      comments {
        id
        body
        author {
          id
          fullName
        }
      }
    }
  }
}
```

Will execute with these two queries:

```sql
SELECT
  "user"."id" AS "id",
  "user"."email_address" AS "email_address",
  "posts"."id" AS "posts__id",
  "posts"."body" AS "posts__body",
  "user"."first_name" AS "first_name",
  "user"."last_name" AS "last_name"
FROM accounts AS "user"
LEFT JOIN posts AS "posts" ON "user".id = "posts".author_id
WHERE "user".id = 2

SELECT
  "comments"."id" AS "id",
  "comments"."body" AS "body",
  "author"."id" AS "author__id",
  "author"."first_name" AS "author__first_name",
  "author"."last_name" AS "author__last_name",
  "comments"."post_id" AS "post_id"
FROM comments AS "comments"
LEFT JOIN accounts AS "author" ON "comments".author_id = "author".id
WHERE "comments".archived = FALSE AND "comments"."post_id" IN (2,8,11,12)
```

Two database queries are made regardless of the number of posts, another way to get around the N + 1 problem, without a `JOIN`.

Although this also works perfectly fine for a one-to-one relation, it is not recommended.
Not much is gained by batching on a one-to-one since using a simple `JOIN` would not burden the database greatly.
