## Correlated Subqueries

Sometimes there are things like grouping that don't fit well into the Join Monster constraints.
The `sqlExpr` can be used to obtain incongruous information.
Suppose we just want the number of comments on a `Post` without fetching all the actual comments.

```js
const Post = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    numComments: {
      description: 'The number of comments on this post',
      type: GraphQLInt,
      // use a correlated subquery in a raw SQL expression to do things like aggregation
      extensions: {
        joinMonster: {
          sqlExpr: postTable =>
            `(SELECT count(*) FROM comments WHERE post_id = ${postTable}.id AND archived = FALSE)`
        }
      }
    }
  })
})
```

## Replacing a JOIN

Aggregation is another potential workaround to having too many joins. For example, PostgreSQL has the `json_agg` function which can place the contents of an entire table into a column by serializing it as JSON. We'll use this to get the comments on each `Post` using neither a `JOIN` nor a separate batch. First, lets create an object type, `SimpleComment`, the does **not** map to a SQL table.

```javascript
const SimpleComment = new GraphQLObjectType({
  description: 'comments on the post without join capabilities',
  name: 'SimpleComment',
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    body: {
      type: GraphQLString
    },
    authorId: {
      type: GraphQLInt,
      resolve: comment => comment.author_id
    },
    postId: {
      type: GraphQLInt,
      resolve: comment => comment.post_id
    },
    archived: {
      type: GraphQLBoolean
    }
  })
})
```

Now we can add a field to `Post` that aggregates the `comments` table instead of joining on it.

```javascript
const Post = new GraphQLObjectType({
  // ...
  fields: () => ({
    commentsWithoutJoin: {
      type: new GraphQLList(SimpleComment),
      extensions: {
        joinMonster: {
          sqlExpr: postTable =>
            `(SELECT json_agg(comments) FROM comments WHERE comments.post_id = ${postTable}.id AND comments.archived = FALSE)`
        }
      }
    }
  })
})
```

This should work without any additional data munging if you're using `knex`, as it automatically parses JSON types from PostgreSQL. Now a query like this:

```graphql
{
  user(id: 2) {
    fullName
    email
    posts {
      id
      body
      commentsWithoutJoin {
        id
        body
        authorId
      }
    }
  }
}
```

...only requires a single `JOIN`.

```sql
SELECT
  "user"."id" AS "id",
  "user"."email_address" AS "email_address",
  "posts"."id" AS "posts__id",
  "posts"."body" AS "posts__body",
  (SELECT json_agg(comments) FROM comments WHERE comments.post_id = "posts".id AND comments.archived = FALSE) AS "posts__commentsWithoutJoin",
  "user"."first_name" AS "first_name",
  "user"."last_name" AS "last_name"
FROM accounts AS "user"
LEFT JOIN posts AS "posts" ON "user".id = "posts".author_id
WHERE "user".id = 2
```
