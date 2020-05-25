We'll set up the example API in [the demo](https://join-monster.herokuapp.com/graphql?query=%7B%20users%20%7B%20%0A%20%20id%2C%20fullName%2C%20email%0A%20%20posts%20%7B%20id%2C%20body%20%7D%0A%7D%7D). You can view the source code [here](https://github.com/stems/join-monster-demo/tree/master/schema-basic). If you would like to set this up from scratch, feel free the use the sample data provided for **SQLite3** at `/data/demo-data.sl3`.

## Defining SQL Schema

We'll set up a little API for a simple blog site built on SQLite3. It will have `Users` that can make `Posts` as well as `Comments` on people's posts.
We will also let them follow other users and like comments.
Here is a picture of the SQL schema.

![schema-example](img/schema-sql.png)

I'll omit the code to set up the SQL tables.
[Here](https://github.com/join-monster/join-monster/blob/master/test-api/data/schema/sqlite3.sql) is an example of how it might be done.
Now let's look at how the GraphQL API inteface on top of this will look.

![schema-graphql](img/schema-graphql.png)

The `User` is the top-level object type. It has a list of posts and comments the user has authored, as well as a list of users they are following. `Post` has a list of comments on the post, and the `Comment` has a list of the users that like it.

## Declaring GraphQL Schema

Here is how the [graphql-js](https://github.com/graphql/graphql-js) schema would look, beginning with the top-level `User`.

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
    fullName: {
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

For now, we'll just provide a list of *all the users*. We'll fix this later.
This won't work yet. There are several things missing. Next, we'll map this object type to our `accounts` table in SQL.

