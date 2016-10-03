![join-monster](img/join_monster.png)
[![npm version](https://badge.fury.io/js/join-monster.svg)](https://badge.fury.io/js/join-monster)

## What Is It?

Join Monster is a JavaScript execution layer from GraphQL to SQL for batch data fetching for the Node.js [graphql-js](https://github.com/graphql/graphql-js) implementation. It's a function that takes a GraphQL query and dynamically **translates GraphQL to SQL** for efficient data retrieval, all in a single batch before resolution. It fetches only the data you need - *nothing more, nothing less*.

It solves the problem of making too many database queries, i.e. the "round-trip" problem, where the round-trips are requests for data over the TCP/IP stack between your API server and your SQL database. Think of it as an alternative to Facebook's [DataLoader](https://github.com/facebook/dataloader), but with more specificity toward SQL and hence simpler to use with SQL.

It is **NOT** a tool for automatically creating a schema for you GraphQL from your database or vice versa. You retain the freedom and power to define your schemas how you want. Join Monster simply "compiles" a GraphQL query to a SQL query *based on the existing schemas*. It fits into existing applications and can be seamlessly removed later or used to varying degree. It's is a little opinionated, but not a full ORM.


## Preview

Instead of writing the SQL yourself, you give Join Monster a bit of information about your SQL schema. It takes care of constructing the SQL query. Your queries can be as simple as this:

```
{                           SELECT                               {
  user(id: 1) {               "user"."id",                         user: {
    idEncoded                 "user"."first_name",                   idEncoded: 'MQ==',
    fullName        ==>       "user"."last_name",        ==>         fullName: 'andrew carlson',
    email                     "user"."email_address"                 email: 'andrew@stem.is'
  }                         FROM "accounts" AS "user"              }
}                           WHERE "user"."id" = 1                }
```

To something as complex as this:

```graphql
{
  users {
    id, idEncoded, fullName, email
    following { id, fullName }
    comments {
      body
      author { id, fullName }
      post {
        id, body
        author { id, fullName }
      }
    }
  }
}
```

which becomes...

```sql
SELECT
  "users"."id" AS "id",
  "users"."first_name" AS "first_name",
  "users"."last_name" AS "last_name",
  "users"."email_address" AS "email_address",
  "following"."id" AS "following__id",
  "following"."first_name" AS "following__first_name",
  "following"."last_name" AS "following__last_name",
  "comments"."id" AS "comments__id",
  "comments"."body" AS "comments__body",
  "author"."id" AS "comments__author__id",
  "author"."first_name" AS "comments__author__first_name",
  "author"."last_name" AS "comments__author__last_name",
  "post"."id" AS "comments__post__id",
  "post"."body" AS "comments__post__body",
  "author$"."id" AS "comments__post__author$__id",
  "author$"."first_name" AS "comments__post__author$__first_name",
  "author$"."last_name" AS "comments__post__author$__last_name"
FROM "accounts" AS "users"
LEFT JOIN "relationships" AS "relationships" ON "users".id = "relationships".follower_id
LEFT JOIN "accounts" AS "following" ON "relationships".followee_id = "following".id
LEFT JOIN "comments" AS "comments" ON "users".id = "comments".author_id
LEFT JOIN "accounts" AS "author" ON "comments".author_id = "author".id
LEFT JOIN "posts" AS "post" ON "comments".post_id = "post".id
LEFT JOIN "accounts" AS "author$" ON "post".author_id = "author$".id
```

and responds with...

```javascript
{
  "data": {
    "users": [
      {
        "id": 1,
        "idEncoded": "MQ==",
        "fullName": "andrew carlson",
        "email": "andrew@stem.is",
        "following": [
          {
            "id": 2,
            "fullName": "matt elder"
          }
        ],
        "comments": [
          {
            "body": "Wow this is a great post, Matt.",
            "author": {
              "id": 1,
              "fullName": "andrew carlson"
            },
            "post": {
              "id": 1,
              "body": "If I could marry a programming language, it would be Haskell.",
              "author": {
                "id": 2,
                "fullName": "matt elder"
              }
            }
          }
        ]
      },
      {
        "id": 2,
        "idEncoded": "Mg==",
        "fullName": "matt elder",
        "email": "matt@stem.is",
        "following": [],
        "comments": []
      }
    ]
  }
}
```

## Demo

See it in action with [this demo API](https://join-monster.herokuapp.com/graphql?query=%7B%20users%20%7B%20%0A%20%20id%2C%20fullName%2C%20email%0A%20%20posts%20%7B%20id%2C%20body%20%7D%0A%7D%7D).
