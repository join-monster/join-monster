For an example usage, check the [example](https://github.com/stems/join-monster/tree/master/example) directory in the Join Monster repo for a reference. There is also some sample data provided for **SQLite3**.

## Defining SQL Schema

We'll set up a little API for a simple blog site for `Users` that can make `Posts` as well as `Comments` on people's posts. We will also let them follow other users. Here is a picture of the schema.

![schema-example](img/schema-example.png)

I'll omit the code to set up the SQL tables. You can find the implementation [here](https://github.com/stems/join-monster/blob/master/example/data/schema.sql). Now let's take a look at the application layer.


## Declaring GraphQL Schema

Here is how the [graphql-js](https://github.com/graphql/graphql-js) schema would look.

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

This won't work yet. There are several things missing. Next, we'll map this object type to our `accounts` table in SQL.

