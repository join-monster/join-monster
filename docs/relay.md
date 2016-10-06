## Demo

Join Monster works well with [graphql-relay-js](https://github.com/graphql/graphql-relay-js). Check out the Relay-compliant [version of the demo](https://join-monster.herokuapp.com/graphql-relay?query=%7B%0A%20%20node(id%3A%20"UG9zdDoz")%20%7B%0A%20%20%20%20...%20on%20Post%20%7B%20body%20%7D%0A%20%20%7D%0A%20%20user(id%3A%202)%20%7B%0A%20%20%20%20posts%20%7B%0A%20%20%20%20%20%20pageInfo%20%7B%0A%20%20%20%20%20%20%20%20hasNextPage%0A%20%20%20%20%20%20%20%20hasPreviousPage%0A%20%20%20%20%20%20%20%20startCursor%0A%20%20%20%20%20%20%20%20endCursor%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20node%20%7B%20id%2C%20body%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%20%20comments(first%3A%202%2C%20after%3A%20"YXJyYXljb25uZWN0aW9uOjA%3D")%20%7B%0A%20%20%20%20%20%20pageInfo%20%7B%0A%20%20%20%20%20%20%20%20hasNextPage%0A%20%20%20%20%20%20%20%20hasPreviousPage%0A%20%20%20%20%20%20%20%20startCursor%0A%20%20%20%20%20%20%20%20endCursor%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20node%20%7B%20id%2C%20body%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D).

## Global ID

These are relatively straight-forward, all you need to do is provide the `id` which we'll take from a column and *voila*.

```javascript
import { globalIdField } from 'graphql-relay'

const User = new GraphQLObjectType({
  name: 'User',
  sqlTable: 'accounts',
  uniqueKey: 'id',
  fields: () => ({
    //...
    id: {
      description: 'The global ID for the Relay spec',
      ...globalIdField(),
      sqlColumn: 'id'
    },
  })
})
```

## Node Type

Join Monster provides a helper for easily fetching data in order to implement Relay's **Node Interface**.

```javascript
import {
  nodeDefinitions,
  fromGlobalId
} from 'graphql-relay'

const { nodeInterface, nodeField } = nodeDefinitions(
  // resolve the ID to an object
  (globalId, context, ast) => {
    // parse the globalID
    const { type, id } = fromGlobalId(globalId)
    // pass the type name and other info. `joinMonster` will find the type from the name and write the SQL
    return joinMonster.getNode(type, ast, context,
      table => `${table}.id = ${id}`,
      sql => knex.raw(sql)
    )
  },
  // determines the type. Join Monster places that type onto the result object on the "__type__" property
  obj => obj.__type__
)

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    node: nodeField,
    users: {...}
  })
})
```

Similar to the main `joinMonster` function, it expects the GraphQL AST, a context, and a function for calling the database that receives the generated SQL. It will also need to type name and a `where` function. See [API](/API/#getNode) for details

## Connection Types

Join Monster will automatically detect a Relay Connection type and drill through it to get the necessary metadata off your object type contained within. We just have to import and use the helpers.

```javascript
import {
  globalIdField,
  connectionArgs,
  connectionDefinitions,
  connectionFromArray
} from 'graphql-relay'

import Post from './Post'
import Comment from './Comment'

const { connectionType: PostConnection } = connectionDefinitions({ nodeType: Post })
const { connectionType: CommentConnection } = connectionDefinitions({ nodeType: Comment })

const User = new GraphQLObjectType({
  name: 'User',
  sqlTable: 'accounts',
  uniqueKey: 'id',
  fields: () => ({
    // ...
    id: {
      ...globalIdField(),
      sqlColumn: 'id'
    },
    comments: {
      type: CommentConnection,
      args: connectionArgs,
      resolve: (user, args) => {
        return connectionFromArray(user.comments, args)
      },
      sqlJoin: (userTable, commentTable) => `${userTable}.id = ${commentTable}.author_id`
    },
    posts: {
      type: PostConnection, 
      args: connectionArgs,
      resolve: (user, args) => {
        return connectionFromArray(user.posts, args)
      },
      sqlJoin: (userTable, postTable) => `${userTable}.id = ${postTable}.author_id`
    },
  })
})
```
