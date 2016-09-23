![join-monster](img/join_monster.png)

## What is Join Monster?

A JavaScript execution layer from GraphQL to SQL aimed at solving the round-trip problem between the API and the database.

It is **NOT** a tool for creating a schema for you GraphQL from your database or vice versa. You retain the freedom and power to define your schemas how you want. Join Monster simply **translates** a GraphQL query to a SQL query *based on the existing schemas*.

## The problem with GraphQL & SQL that we solve
GraphQL is an elegant solution the round-trip problem often encountered with REST APIs. Many are using it in conjunction with the power of SQL databases. But how do we mitigate the number of roundtrips to our **database**? Consider the following schema: `Users` that have many `Posts` that have many `Comments`.

![schema](img/schema.png)

Here is a sensible query to retrieve some info from these tables.
```graphql
{
  users {
    name
    posts {
      body
      comments { body, author_id }
    }
  }
}
```

How might we go about resolving this?
```javascript
const User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    name: { /*...*/ },
    posts: {
      type: new GraphQLList(Post),
      resolve: user => {
        return db.query(`SELECT * FROM posts WHERE author_id = '?'`, user.id)
      }
    }
  })
})

const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    body: { /*...*/ },
    comments: {
      type: new GraphQLList(Comment),
      resolve: post => {
        return db.query(`SELECT * FROM comments WHERE post_id = '?'`, post.id)
      }
    }
  })
})
```

Elegant as this is, consider what happens if the user has 20 posts. That's one SQL query for the posts, and **20 more** for each post's set of comments. This is a total of at least 21 round-trips to the database (we haven't considered how we got the `User` data)! This could easily become a performance bottleneck. We've encountered the round-trip problem again. GraphQL was supposed to give us a solution for this!

Of course, it doesn't hvae to be done this way. Perhaps we can reduce the round-trips by doing the joins all at once in the `User` resolver.

```javascript
const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: {
      type: new GraphQLList(User),
      resolve: async () => {
        const sql = `
          SELECT * from accounts
          JOIN posts ON posts.author_id = accounts.id
          JOIN comments ON comments.post_id = posts.id
        `
        const rows = await db.query(sql)
        const tree = nestObjectShape(rows)
        return tree
      }
    }
  })
})
```
So we got all the data at the top level, this will simplify the `Posts` and `Comments` resolvers.
```javascript
const User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    name: { /*...*/ },
    posts: {
      type: new GraphQLList(Post)
    }
  })
})

const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    body: { /*...*/ },
    comments: {
      type: new GraphQLList(Comment)
    }
  })
})
```
Although we made the round-trip problem go away, what if another query doesn't even ask for the comments?

```graphql
{
  users {
    name
    posts { body }
  }
}
```

During the execution of this request, it will wastefully join on the comments! The resolving phase essentially becomes a bunch of property lookups for a conglomerate result we prepared in the top-level. It's not too bad now, but this approach will not scale to more complex schema. Consider a schema like this:

![schema-complex](img/schema-complex.png)

Imagine doing all those joins up front. This is especially wasteful when client only want a couple of those resources. We now have the inverse problem: **getting too much data.** Furthermore, we've reduced the maintainability of our code. Changes to the schema will require changes to the SQL query that fetches all the data. Often times there is the extra burden of converting the database result into the Object shape, since many database drivers simply return a flat, tabular structure.

## How it works

Join Monster fetches only the data you need - *nothing more, nothing less*, just like to original philosophy of GraphQL. It reads the parsed GraphQL query, looks at your schema definition, and generates the SQL automatically that will fetch no more than what is required to fulfill the request.

Instead of writing the SQL yourself, you configure the schema definition with a bit of additional metadata about the SQL schema. Your queries can be as simple as this:

```
{                         SELECT                             {
  user(id: 1) {             "user"."id",                       user: {
    idEncoded               "user"."first_name",                 idEncoded: 'MQ==',
    full_name     ==>       "user"."last_name",      ==>         full_name: 'andrew carlson',
    email                   "user"."email_address"               email: 'andrew@stem.is'
  }                       FROM "accounts" AS "user"            }
}                         WHERE "user".id = 1                }
```

To something as complex as this:

```graphql
{
  users {
    id, idEncoded, full_name, email
    following { id, full_name }
    comments {
      body
      author { id, full_name }
      post {
        id, body
        author { id, full_name }
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
        "full_name": "andrew carlson",
        "email": "andrew@stem.is",
        "following": [
          {
            "id": 2,
            "full_name": "matt elder"
          }
        ],
        "comments": [
          {
            "body": "Wow this is a great post, Matt.",
            "author": {
              "id": 1,
              "full_name": "andrew carlson"
            },
            "post": {
              "id": 1,
              "body": "If I could marry a programming language, it would be Haskell.",
              "author": {
                "id": 2,
                "full_name": "matt elder"
              }
            }
          }
        ]
      },
      {
        "id": 2,
        "idEncoded": "Mg==",
        "full_name": "matt elder",
        "email": "matt@stem.is",
        "following": [],
        "comments": []
      }
    ]
  }
}
```

The SQL queries will **adapt** not only with the varying complexities of queries, but also changes in the schema. No back-and-forth from web server to database. No need to get convert the raw result to the nested structure. Lots of benefits for a little bit of configuration.

- [X] Fetch all the data in a single database query.
- [X] Automatically generate adapting SQL queries.
- [X] Automatically build the nested object structure.
- [X] Easier maintainability.
- [X] Coexists with your custom resolve functions.

Join Monster is a means of fetching data from your SQL database. It will not prevent you from writing custom resolvers or hinder your ability to define either of your schemas.

## Usage

See the `example` directory for a reference. I'll demonstrate the steps to set up this example.

![schema-example](img/schema-example.png)

### 1. Declare GraphQL and SQL schemas like you normally would

I'll omit the SQL. Here is how the `graphql-js` schema would look.

```javascript
import { GraphQLSchema } from 'graphql'
import { GraphQLObjectType, GraphQLList, GraphQLString, GraphQLInt } from 'graphql'

const User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    email: {
      type: GraphQLString
    },
    idEncoded: {
      description: 'The ID base-64 encoded',
      type: GraphQLString,
      resolve: user => toBase64(user.idEncoded)
    },
    full_name: {
      description: 'A user\'s first and last name',
      type: GraphQLString
    }
  })
})

const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: {
      type: new GraphQLList(User),
      resolve: () => {} // TODO
    }
  })
})

export default new GraphQLSchema({
  description: 'a test schema',
  query: QueryRoot
})
```

### 2. Map Object Types to SQL Tables

Your SQL Tables must map to a `GraphQLObjectType`. Add the `sqlTable` and `uniqueKey` properties to the type definition.

```javascript
const User = new GraphQLObjectType({
  name: 'User',
  sqlTable: 'accounts', // the SQL table for this object type is called "accounts"
  uniqueKey: 'id', // only required if we ever retrieve a GraphQLList of User types. Used for de-duplication
  fields: () => ({ /*...*/ })
})
```

### 3. Add Metadata to the `User` Fields

You'll need to provide a bit of information about each column, like `sqlColumn` and `sqlDeps`.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    id: {
      type: GraphQLInt
      // the column name is assumed to be the same as the field name
    },
    email: {
      type: GraphQLString,
      // if the column name is different, it is specified
      sqlColumn: 'email_address'
    },
    idEncoded: {
      description: 'The ID base-64 encoded',
      type: GraphQLString,
      sqlColumn: 'id',
      // this field uses a sqlColumn and applies a resolver function on the value
      resolve: user => toBase64(user.idEncoded)
    },
    full_name: {
      description: 'A user\'s first and last name',
      type: GraphQLString,
      // perhaps there is no 1-to-1 mapping of field to column
      // this field depends on multiple columns
      sqlDeps: [ 'first_name', 'last_name' ],
      resolve: user => `${user.first_name} ${user.last_name}`
    }
  })
})

function toBase64(clear) {
  return Buffer.from(String(clear)).toString('base64')
}
```

### 3. Let Join Monster Grab Your Data

Import `joinMonster`. Have the top-most field that maps to a SQL table implement a resolver function that calls `joinMonster`. Simply pass it the AST info, a "context" object (which can be empty for now), and a callback that takes the SQL as a parameter, calls the database, and returns the data (or a `Promise` of the data). The data must be an array of objects where each object represents a row in the result set.

```javascript
import joinMonster from 'join-monster'

const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: {
      type: new GraphQLList(User),
      resolve: (parent, args, context, ast) => {
        return joinMonster(ast, {}, sql => {
          // knex is a SQL query library for NodeJS. This method returns a `Promise` of the data
          return knex.raw(sql)
        })
      }
    }
  })
})
```

You'll need to set up the connection to the database. For the `example` there is a small SQLite3 file provided. You can import `knex` and load the data like this.
```javascript
const dataFilePath = 'path/to/the/data.sl3' // make this the path to the database file
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: dataFilePath
  }
})
```

You're ready to handle queries on the `Users`!
```graphql
{
  users { id, idEncoded, email, full_name }
}
```

### 4. Adding Joins

Let's add a field to our `User` which is a `GraphQLObjectType`: their `Comments` which also map to a SQL table. Let's define that type and add the additional SQL metadata.

```javascript
const Comment = new GraphQLObjectType({
  name: 'Comment',
  sqlTable: 'comments',
  uniqueKey: 'id',
  fields: () => ({
    // id and body column names are the same
    id: {
      type: GraphQLInt
    },
    body: {
      type: GraphQLString
    }
  })
})
```

We need to add a field to our `User`, and tell `joinMonster` how to grab these comments via a `JOIN`. This can be done with a `sqlJoin` property with a function. It will take the parent table and child table names (actually the aliases that `joinMonster` will generate) as arguments respectively and return the join condition.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    comments: {
      type: new GraphQLList(Comment),
      // a function to generate the join condition from the table aliases
      // NOTE: you must double-quote any case-sensitive column names the table aliases are already quoted
      sqlJoin: (userTable, commentTable) => `${userTable}.id = ${commentTable}.author_id`
    }
  })
})
```

Now you can query for the comments for each user!
```graphql
{
  users { 
    id, idEncoded, email, full_name
    comments { id, body }
  }
}
```
