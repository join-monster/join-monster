# Welcome to the Join Monster Source Code

Each call to `joinMonster` has the following phases:

1. Receive the GraphQL `resolveInfo` and traverse the GraphQL AST, an abstract representation of the query after lexical analysis.
1. Simultaneously traverse the definitions of the types and fields in the schema, collecting the important metadata the user added, e.g. `sqlTable`, `sqlColumn`, etc.
1. Build up another abstract representation, the "SQL AST".
1. Pass SQL AST to the stringifier to compile the query.
1. Pass SQL AST to "define the object shape" so we can hydrate the results.
1. Pass the SQL to the user's database callback to get the results.
1. Hydrate the data.
1. Check SQL AST to see if they have any more batches to compile. If yes, repeat steps 4-8.

![internals](https://raw.githubusercontent.com/join-monster/join-monster/master/docs/img/internals.png)

This whole process begins when you call `joinMonster` and pass it the `resolveInfo`.
Join Monster looks at the parsed query AST, fragments, variables, your schema definition, and everything needed to query and hydrate the data. After traversing the whole query AST, an intermediate representation is generated: a hybrid of the GraphQL query and the SQL metadata. We call it the **SQL AST**.

Let's walk through an example. Using the example schema from the documentation, we'll examine the following query:

```graphql
{
  user(id: 2) {
    id
    email
    fullName
    favNums  # this field resolves separately from join monster

    # this requires a JOIN
    posts {
      body
      # this will be fetched in a second batch
      comments {
        body
      }
    }
  }
}
```

Becomes this SQL AST:

```javascript
{ args: { id: 2 },
  type: 'table',
  name: 'accounts',
  as: 'user',
  children:
   [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
     { type: 'column',
       name: 'email_address',
       fieldName: 'email',
       as: 'email_address' },
     { type: 'columnDeps',
       names: { first_name: 'first_name', last_name: 'last_name' } } ],
     { type: 'noop' },
     { type: 'table',
       name: 'posts',
       as: 'posts',
       orderBy: { body: 'desc' },
       children:
        [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
          { type: 'column', name: 'body', fieldName: 'body', as: 'body' },
          { type: 'table',
            name: 'comments',
            as: 'comments',
            orderBy: { id: 'desc' },
            children:
             [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
               { type: 'column', name: 'body', fieldName: 'body', as: 'body' },
               { type: 'columnDeps', names: {} } ],
            fieldName: 'comments',
            grabMany: true,
            where: [Function: where],
            sqlBatch:
             { thisKey:
                { type: 'column',
                  name: 'post_id',
                  fieldName: 'post_id',
                  as: 'post_id' },
               parentKey: { type: 'column', name: 'id', fieldName: 'id', as: 'id' } } },
          { type: 'columnDeps', names: {} } ],
       fieldName: 'posts',
       grabMany: true,
       where: [Function: where],
       sqlJoin: [Function: sqlJoin] },
  fieldName: 'user',
  grabMany: false,
  where: [Function: where] }
```

This AST makes it easier to proceed with future tasks. It will also allow to reuse the rest of the code when porting Join Monster to other implementations of GraphQL. All that should be necessary to support a new implementation is figuring out how to genenerate the AST. The rest should just work.

This gets compiled to 2 SQL queries. Every SQL AST will become at least one SQL query. Each one must be compiled, executed by the DBMS, and hydrated. This process for the multiple queries is orchestrated by `/src/batch-planner`.

```sql
SELECT
  "user"."id" AS "id",
  "user"."email_address" AS "email_address",
  "posts"."id" AS "posts__id",
  "posts"."body" AS "posts__body",
  "user"."first_name" AS "first_name",
  "user"."last_name" AS "last_name"
FROM "accounts" "user"
LEFT JOIN "posts" "posts" ON "posts"."author_id" = "user"."id"
WHERE "user"."id" = 2
ORDER BY "posts"."body" DESC

-- second query
SELECT
  "comments"."id" AS "id",
  "comments"."body" AS "body",
  "comments"."post_id" AS "post_id"
FROM "comments" "comments"
WHERE "comments"."post_id" IN (1,3) -- values retrieved from the `post_ids`s of the first query
ORDER BY "comments"."id" DESC
```

The SQL AST is also converted to another structure that specifies the **Shape Definition**, which is used for the nesting/shaping process.
There will be one per batch.
It is passed to the [NestHydrationJS](https://github.com/CoursePark/NestHydrationJS) library to produce the right shape.

```javascript
{ id: 'id',
  email: 'email_address',
  posts: [ { id: 'posts__id', body: 'posts__body' } ],
  first_name: 'first_name',
  last_name: 'last_name' }

[ { id: 'id', body: 'body', post_id: 'post_id' } ]
```

The SQL is then passed to the user-defined function for talking to the database.
This function must then return the "raw data", a flat array of all the rows.
Here is an exmaple for what the results of the first query might look like.

```javascript
[ { id: 2,
    email_address: 'matt@stem.is',
    posts__id: 1,
    posts__body: 'If I could marry a programming language, it would be Haskell.',
    first_name: 'matt',
    last_name: 'elder' },
  { id: 2,
    email_address: 'matt@stem.is',
    posts__id: 3,
    posts__body: 'Here is who to contact if your brain has been ruined by Java.',
    first_name: 'matt',
    last_name: 'elder' } ]
```

The Shape Definition is used to nest the data and deduplicate any entities within the rows. 
The properties on this data tree will have the same names as their respective fields, so children of the resolver that called `joinMonster` know where to find the data.

When all the batches are fetched and hydrated, they are "joined" in the application to form one fully shaped data structure. The rest of the execution phase proceeds with these new data.

```javascript
{
  "data": {
    "user": {
      "id": 2,
      "email": "matt@stem.is",
      "fullName": "matt elder",
      "favNums": [
        1,
        2,
        3
      ],
      "posts": [
        {
          "body": "If I could marry a programming language, it would be Haskell.",
          "comments": [
            {
              "body": "That's ultra weird bro."
            },
            {
              "body": "That's super weird dude."
            },
            {
              "body": "Wow this is a great post, Matt."
            }
          ]
        },
        {
          "body": "Here is who to contact if your brain has been ruined by Java.",
          "comments": [
            {
              "body": "Yeah well Java 8 added lambdas."
            }
          ]
        }
      ]
    }
  }
}
```

