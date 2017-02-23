## Fewer Requests not Always Better

So far Join Monster has fetched all data in a single query to minimize network latency by leveraging the `JOIN`.

![query-plan-1](img/query-plan-1.png)

Although we can resolve any GraphQL query with a single round-trip to the database, the queries generated can be very expensive. Suppose the client wants data from all the object types we exposed.

```graphql
{
  user(id: 2) {
    fullName
    email
    posts {
      id
      body
      createdAt
      comments {
        id
        body
        author {
          id
          fullName
        }
        likers {
          id
          fullName
        }
      }
    }
    following {
      id
      fullName
    }
  }
}
```

```sql
SELECT
  "user"."id" AS "id",
  "user"."email_address" AS "email_address",
  "posts"."id" AS "posts__id",
  "posts"."body" AS "posts__body",
  "posts"."created_at" AS "posts__created_at",
  "comments"."id" AS "posts__comments__id",
  "comments"."body" AS "posts__comments__body",
  "author"."id" AS "posts__comments__author__id",
  "author"."first_name" AS "posts__comments__author__first_name",
  "author"."last_name" AS "posts__comments__author__last_name",
  "likers"."id" AS "posts__comments__likers__id",
  "likers"."first_name" AS "posts__comments__likers__first_name",
  "likers"."last_name" AS "posts__comments__likers__last_name",
  "following"."id" AS "following__id",
  "following"."first_name" AS "following__first_name",
  "following"."last_name" AS "following__last_name",
  "user"."first_name" AS "first_name",
  "user"."last_name" AS "last_name"
FROM accounts AS "user"
LEFT JOIN posts AS "posts" ON "user".id = "posts".author_id
LEFT JOIN comments AS "comments" ON "posts".id = "comments".post_id AND "comments".archived = FALSE
LEFT JOIN accounts AS "author" ON "comments".author_id = "author".id
LEFT JOIN likes AS "likes" ON "comments".id = "likes".comment_id
LEFT JOIN accounts AS "likers" ON "likes".account_id = "likers".id
LEFT JOIN relationships AS "relationships" ON "user".id = "relationships".follower_id
LEFT JOIN accounts AS "following" ON "relationships".followee_id = "following".id
WHERE "user".id = 2
```

Yikes! The joins will get exponentially more costly.
That can get intense on the database CPU.
Instead of using joins everywhere, how about getting the user and the posts in one request, and then getting the comments and likers in another?
We could split it into **two queries** and use a `WHERE IN` to get the appropriate comments for the posts.


```sql
SELECT
  "user"."id" AS "id",
  "user"."email_address" AS "email_address",
  "posts"."id" AS "posts__id",
  "posts"."body" AS "posts__body",
  "posts"."created_at" AS "posts__created_at",
  "following"."id" AS "following__id",
  "following"."first_name" AS "following__first_name",
  "following"."last_name" AS "following__last_name",
  "user"."first_name" AS "first_name",
  "user"."last_name" AS "last_name"
FROM accounts AS "user"
LEFT JOIN posts AS "posts" ON "user".id = "posts".author_id
LEFT JOIN relationships AS "relationships" ON "user".id = "relationships".follower_id
LEFT JOIN accounts AS "following" ON "relationships".followee_id = "following".id
WHERE "user".id = 2

-- the second query, based on the results of the first
SELECT
  "comments"."id" AS "id",
  "comments"."body" AS "body",
  "author"."id" AS "author__id",
  "author"."first_name" AS "author__first_name",
  "author"."last_name" AS "author__last_name",
  "likers"."id" AS "likers__id",
  "likers"."first_name" AS "likers__first_name",
  "likers"."last_name" AS "likers__last_name",
  "comments"."post_id" AS "post_id"
FROM comments AS "comments"
LEFT JOIN accounts AS "author" ON "comments".author_id = "author".id
LEFT JOIN likes AS "likes" ON "comments".id = "likes".comment_id
LEFT JOIN accounts AS "likers" ON "likes".account_id = "likers".id
WHERE "comments".archived = FALSE AND "comments"."post_id" IN (2,8,11,12)
```

Now there is one fewer join and the data is fetched over two separate queries.
This mitigates the exponential increase in the number of rows per join.
This is effectively a different query **plan**.

It's a trade-off between number of batches and joins.
Too many batches could incur a lot of network latency.
Too many joins could incur CPU load on the database.
The best approach will depend on the heuristics of your application.
We'll see how to configure this in order to find out which is the best.

