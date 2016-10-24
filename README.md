<!-- Use fully qualified URL for the images so they'll also be visible from the NPM page too -->
![join-monster](https://raw.githubusercontent.com/stems/join-monster/master/docs/img/join_monster.png)
[![npm version](https://badge.fury.io/js/join-monster.svg)](https://badge.fury.io/js/join-monster) [![Build Status](https://travis-ci.org/stems/join-monster.svg?branch=master)](https://travis-ci.org/stems/join-monster) [![Documentation Status](https://readthedocs.org/projects/join-monster/badge/?version=latest)](http://join-monster.readthedocs.io/en/latest/?badge=latest)

**Batch Data-Fetching for GraphQL and SQL.**
- [Read the Documentation](http://join-monster.readthedocs.io/en/latest/)
- Try Demo: [Non-Relay Compliant](https://join-monster.herokuapp.com/graphql?query=%7B%20users%20%7B%20%0A%20%20id%2C%20fullName%2C%20email%0A%20%20posts%20%7B%20id%2C%20body%20%7D%0A%7D%7D) or [Relay Compliant](https://join-monster.herokuapp.com/graphql-relay?query=%7B%0A%20%20node(id%3A%20%22VXNlcjoy%22)%20%7B%0A%20%20%20%20...%20on%20User%20%7B%20id%2C%20fullName%20%7D%0A%20%20%7D%0A%20%20user(id%3A%202)%20%7B%0A%20%20%20%20id%0A%20%20%20%20fullName%0A%20%20%20%20posts(first%3A%202%2C%20after%3A%20%22eyJpZCI6NDh9%22)%20%7B%0A%20%20%20%20%20%20pageInfo%20%7B%0A%20%20%20%20%20%20%20%20hasNextPage%0A%20%20%20%20%20%20%20%20startCursor%0A%20%20%20%20%20%20%20%20endCursor%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20cursor%0A%20%20%20%20%20%20%20%20node%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20body%0A%20%20%20%20%20%20%20%20%20%20comments%20(first%3A%203)%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20pageInfo%20%7B%20hasNextPage%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20node%20%7B%20id%2C%20body%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A)
- [Example Repo](https://github.com/stems/join-monster-demo)

## What is Join Monster?

A JavaScript execution layer from GraphQL to SQL for batch data-fetching between the API and the database by dynamically **translating GraphQL to SQL** for efficient data retrieval, all in a single batch before resolution. Simply delcare the data requirements of each field in you schema. Then, for each query, Join Monster will look at what was requested, find the data requirements, fetch, and shape your data.


It is **NOT** a tool for automatically creating a schema for you GraphQL from your database or vice versa. You retain the freedom and power to define your schemas how you want. Join Monster simply "compiles" a GraphQL query to a SQL query *based on the existing schemas*. It fits into existing applications and can be seamlessly removed later or used to varying degree.

```
{                           SELECT                             {
  user(id: 1) {               "user"."id",                       user: {
    idEncoded                 "user"."first_name",                 idEncoded: 'MQ==',
    fullName        ==>       "user"."last_name",        ==>       fullName: 'andrew carlson',
    email                     "user"."email_address"               email: 'andrew@stem.is'
  }                         FROM "accounts" AS "user"            }
}                           WHERE "user".id = 1                }
```

## Why?

- [X] **Batching** - Fetch all the data in a single database query. No back-and-forth round trips.
- [X] **Efficient** - No over-fetching get no more than what you need.
- [X] **Maintainability** - SQL is automatically generated and adaptive. No need to manually write queries or update them when the schema changes.
- [X] **Declarative** - Simply define the *data requirements* of the GraphQL fields on the SQL columns.
- [X] **Unobtrusive** - Coexists with your custom resolve functions and existing schemas. Use it on the whole tree or only in parts. Retain the power and expressiveness in defining your schema.
- [X] **GraphQL becomes the ORM** - Mixing and matching sucks. With only a few additions of metadata, the GraphQL schema *becomes* the mapping relation.

Join Monster is a means of batch-fetching data from your SQL database. It will not prevent you from writing custom resolvers or hinder your ability to define either of your schemas.

[More details on this problem are here](http://join-monster.readthedocs.io/en/latest/problem/).

## Works with the Relay Spec

Great helpers for the **Node Interface** and automatic pagination for **Connection Types**. [See docs](http://join-monster.readthedocs.io/en/latest/relay/).

You don't *have to* use Relay to paginate your API with Join Monster!

## Running the Demo

```shell
$ git clone https://github.com/stems/join-monster-demo.git
$ cd join-monster-demo
$ npm install
$ npm start
# go to http://localhost:3000/graphql
```

Explore the schema, try out some queries, and see what the resulting SQL queries and responses look like in our custom version of GraphiQL!

![graphsiql](https://raw.githubusercontent.com/stems/join-monster/master/docs/img/graphsiql.png)

## Usage

1. Assign your SQL tables to their corresponding `GraphQLObjectTypes`.
2. Add some properties to the object type, like `sqlTable`, `uniqueKey`, `sqlColumn`, and more.
3. Link your tables in your GraphQL fields by writing some `JOIN`s.
4. Resolve any type (and all its descendants) by calling `joinMonster` in its resolver. All it needs is the `resolveInfo` and a callback to send the (one) SQL query to the database. Voila! All your data is returned to the resolver.

```javascript
const User = new GraphQLObjectType({
  name: 'User',
  sqlTable: 'accounts', // the SQL table for this object type is called "accounts"
  uniqueKey: 'id', // the id in each row is unique for this table
  fields: () => ({
    id: {
      // the column name is assumed to be the same as the field name
      type: GraphQLInt
    },
    email: {
      type: GraphQLString,
      // if the column name is different, it must be specified specified
      sqlColumn: 'email_address'
    },
    idEncoded: {
      description: 'The ID base-64 encoded',
      type: GraphQLString,
      sqlColumn: 'id',
      // this field uses a sqlColumn and applies a resolver function on the value
      // if a resolver is present, the `sqlColumn` MUST be specified even if it is the same name as the field
      resolve: user => toBase64(user.idEncoded)
    },
    fullName: {
      description: 'A user\'s first and last name',
      type: GraphQLString,
      // perhaps there is no 1-to-1 mapping of field to column
      // this field depends on multiple columns
      sqlDeps: [ 'first_name', 'last_name' ],
      resolve: user => `${user.first_name} ${user.last_name}`
    },
    // got tables inside tables??
    // get it with a JOIN!
    comments: {
      type: new GraphQLList(Comment),
      // a function to generate the join condition from the table aliases
      sqlJoin(userTable, commentTable) {
        return `${userTable}.id = ${commentTable}.author_id`
      }
    }
  })
})

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


const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    // place this user type in the schema
    user: {
      type: User,
      // let client search for users by `id`
      args: {
        id: { type: GraphQLInt }
      },
      // how to write the where condition
      where: (usersTable, args, context) => {
        if (args.id) return `${usersTable}.id = ${args.id}`
      },
      resolve: (parent, args, context, resolveInfo) => {
        // resolve the user and the comments and any other descendants in a single request and return the data!
        // all you need to pass is the `resolveInfo` and a callback for querying the database
        return joinMonster(resolveInfo, {}, sql => {
          // knex is a query library for SQL databases
          return knex.raw(sql)
        })
      }
    }
  })
})
```

**There's still a lot of work to do. Please feel free to fork and submit a Pull Request!**

## TODO

- [ ] Much better error messages in cases of mistakes (like missing sql properties)
- [ ] Figure out a way to handle Interface and Union types
- [ ] Figure out a way to support the schema language
- [ ] Aggregate functions

