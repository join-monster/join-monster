<!-- Use fully qualified URL for the images so they'll also be visible from the NPM page too -->
![join-monster](https://raw.githubusercontent.com/stems/join-monster/master/docs/img/join_monster.png)
[![npm version](https://badge.fury.io/js/join-monster.svg)](https://badge.fury.io/js/join-monster) [![Build Status](https://travis-ci.org/stems/join-monster.svg?branch=master)](https://travis-ci.org/stems/join-monster) [![Documentation Status](https://readthedocs.org/projects/join-monster/badge/?version=latest)](http://join-monster.readthedocs.io/en/latest/?badge=latest)

### Batch Data Fetching between GraphQL and SQL.

- [Read the Documentation](http://join-monster.readthedocs.io/en/latest/)
- Try Demo: [Non-Relay Compliant](https://join-monster.herokuapp.com/graphql?query=%7B%20users%20%7B%20%0A%20%20id%2C%20fullName%2C%20email%0A%20%20posts%20%7B%20id%2C%20body%20%7D%0A%7D%7D) or [Relay Compliant](https://join-monster.herokuapp.com/graphql-relay?query=%7B%0A%20%20node(id%3A%20%22VXNlcjoy%22)%20%7B%0A%20%20%20%20...%20on%20User%20%7B%20id%2C%20fullName%20%7D%0A%20%20%7D%0A%20%20user(id%3A%202)%20%7B%0A%20%20%20%20id%0A%20%20%20%20fullName%0A%20%20%20%20posts(first%3A%202%2C%20after%3A%20%22eyJpZCI6NDh9%22)%20%7B%0A%20%20%20%20%20%20pageInfo%20%7B%0A%20%20%20%20%20%20%20%20hasNextPage%0A%20%20%20%20%20%20%20%20startCursor%0A%20%20%20%20%20%20%20%20endCursor%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20cursor%0A%20%20%20%20%20%20%20%20node%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20body%0A%20%20%20%20%20%20%20%20%20%20comments%20(first%3A%203)%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20pageInfo%20%7B%20hasNextPage%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20node%20%7B%20id%2C%20body%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A)
- [Example Repo](https://github.com/stems/join-monster-demo)

## What is Join Monster?

It takes a GraphQL query and your schema and generates SQL. Send that SQL to your database and get back all the data needed to resolve  with only one round-trip to the database.

```
{                           SELECT                             {
  user(id: 1) {               "user"."id",                       user: {
    idEncoded                 "user"."first_name",                 idEncoded: 'MQ==',
    fullName        ==>       "user"."last_name",        ==>       fullName: 'andrew carlson',
    email                     "user"."email_address"               email: 'andrew@stem.is'
  }                         FROM "accounts" AS "user"            }
}                           WHERE "user".id = 1                }
```

It works on top of Facebook's [graphql-js](https://github.com/graphql/graphql-js) reference implementation. All you have to do is add a few properties to the objects in your schema and call the `joinMonster` function. A SQL query is "compiled" for you to send to the DBMS. It uses `JOIN`s to get all the data in a single query, and then hydrates the data to be resolved in all the descendant fields.

## Why?

More details on the "round-trip" (a.k.a. N+1) problem are [here](http://join-monster.readthedocs.io/en/latest/problem/).

- [X] **Batching** - Fetch all the data in a single database query. No back-and-forth round trips.
- [X] **Efficient** - No over-fetching data. Retrieve only the data that the client actually requested.
- [X] **Maintainability** - SQL is automatically generated and adaptive. No need to manually write queries or update them when the schema changes.
- [X] **Declarative** - Simply define the *data requirements* of the GraphQL fields on the SQL columns.
- [X] **Unobtrusive** - Coexists with your custom resolve functions and existing schemas. Use it on the whole graph or only in parts. Retain the power and expressiveness in defining your schema.
- [X] **GraphQL becomes the ORM** - Mixing and matching sucks. With only a few additions of metadata, the GraphQL schema *becomes* the mapping relation.

Since it works with the reference implementation, the API is all very familiar. Join Monster is a tool built on top to add batch data fetching. You add some special properties along-side the schema definition that Join Monster knows to look for. The use of [graphql-js](https://github.com/graphql/graphql-js) does not change. You still define your types the same way. You can write resolve functions to mainpulate the data from Join Monster, or incorporate data from elsewhere without breaking out of your "join-monsterized" schema.

## Works with the Relay Spec and Pagination

Great helpers for the **Node Interface** and automatic pagination for **Connection Types**. [See docs](http://join-monster.readthedocs.io/en/latest/relay/).

You don't *have to* use Relay to paginate your API with Join Monster!

## Usage with GraphQL

1. Take your `GraphQLObjectType` from [graphql-js](https://github.com/graphql/graphql-js) and add the SQL table name.
2. Do the fields need values from some SQL columns? Computed columns? Add some additional properties like `sqlColumn`, `sqlDeps`, or `sqlExpr` to the fields. Join Monster will look at these when analyzing the query.
3. Got some relations? Write a function that tells Join Monster how to `JOIN` your tables and it will hydrate hierarchies of data.
4. Resolve any type (and all its descendants) by calling `joinMonster` in its resolver. All it needs is the `resolveInfo` and a callback to send the (one) SQL query to the database. Voila! All your data is returned to the resolver.

```javascript
import joinMonster from 'join-monster'
import {
  GraphQLObjectType,
  GraphQLString,
  // and some other stuff
} from 'graphql'

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
      // this field uses a sqlColumn and applies a resolver function on the value
      // if a resolver is present, the `sqlColumn` MUST be specified even if it is the same name as the field
      sqlColumn: 'id',
      resolve: user => toBase64(user.idEncoded)
    },
    fullName: {
      description: "A user's first and last name",
      type: GraphQLString,
      // perhaps there is no 1-to-1 mapping of field to column
      // this field depends on multiple columns
      sqlDeps: [ 'first_name', 'last_name' ],
      // compute the value with a resolver
      resolve: user => `${user.first_name} ${user.last_name}`
    },
    capitalizedLastName: {
      type: GraphQLString,
      // do a computed column in SQL with raw expression
      sqlExpr: (table, args) => `UPPER(${table}.last_name)`
    },
    // got tables inside tables??
    // get it with a JOIN!
    comments: {
      type: new GraphQLList(Comment),
      // a function to generate the join condition from the table aliases
      sqlJoin(userTable, commentTable) {
        return `${userTable}.id = ${commentTable}.author_id`
      }
    },
    numLegs: {
      description: 'Number of legs this user has.',
      type: GraphQLInt,
      // data isn't coming from the SQL table? no problem! joinMonster will ignore this field
      resolve: () => 2
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


export const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    // place this user type in the schema
    user: {
      type: User,
      // let client search for users by `id`
      args: {
        id: { type: GraphQLInt }
      },
      // how to write the WHERE condition
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

Detailed instructions for set up are found in the [docs](http://join-monster.readthedocs.io/en/latest/data-model).

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

**There's still a lot of work to do. Please feel free to fork and submit a Pull Request!**

## TODO

- [ ] Port to other JavaScript implementations of GraphQL (only the reference implementation currently supported)
- [ ] Add other SQL dialects (Microsoft SQL server, for example, uses `CROSS APPLY` instead of `LATERAL`)
- [ ] Much better error messages in cases of mistakes (like missing sql properties)
- [ ] Figure out a way to handle Interface and Union types
- [ ] Figure out a way to support the schema language
- [ ] Aggregate functions

## NON-GOALS

- Caching: application specific cache invalidation makes this a problem we don't want to solve
- Support EVERY SQL Feature (only the most powerful subset of the most popular databases will be supported)

