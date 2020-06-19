## Demo

Join Monster works well with [graphql-relay-js](https://github.com/graphql/graphql-relay-js). There is built-in support for Global IDs and the `Node` Interface.
Check out the Relay-compliant [version of the demo](https://join-monster.herokuapp.com/graphql-relay?query=%7B%0A%20%20node(id%3A%20%22VXNlcjoy%22)%20%7B%0A%20%20%20%20...%20on%20User%20%7B%20id%2C%20fullName%20%7D%0A%20%20%7D%0A%20%20user(id%3A%202)%20%7B%0A%20%20%20%20id%0A%20%20%20%20fullName%0A%20%20%20%20posts(first%3A%202%2C%20after%3A%20%22eyJpZCI6NDh9%22)%20%7B%0A%20%20%20%20%20%20pageInfo%20%7B%0A%20%20%20%20%20%20%20%20hasNextPage%0A%20%20%20%20%20%20%20%20startCursor%0A%20%20%20%20%20%20%20%20endCursor%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20cursor%0A%20%20%20%20%20%20%20%20node%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20body%0A%20%20%20%20%20%20%20%20%20%20comments%20(first%3A%203)%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20total%0A%20%20%20%20%20%20%20%20%20%20%20%20pageInfo%20%7B%20hasNextPage%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20node%20%7B%20id%2C%20body%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A).
Source code can be found [here](https://github.com/stems/join-monster-demo/tree/master/schema-paginated).


## Global ID

These are Relay's unique identifiers used as cache keys.
Implementing is relatively straight-forward.
We can import the `globalIdField` helper and provide the `id` which we'll take from a column and *voila*.

```javascript
import { globalIdField } from 'graphql-relay'

const User = new GraphQLObjectType({
  name: 'User',
  sqlTable: 'accounts',
  uniqueKey: 'id',
  fields: () => ({
    globalId: {
      description: 'The global ID for the Relay spec',
      ...globalIdField(),
      extensions: {
        joinMonster: {
          sqlDeps: ['id']
        }
      }
    }
    //...
  })
})
```

## Node Interface

The `Node` Interface allows Relay to fetch an instance of any type.
This could technically be useful without using Relay on the client.
Join Monster provides a helper for easily fetching data in order to implement Relay's **Node Interface**. This is the `getNode` method.

```javascript
import joinMonster from 'join-monster'
import {
  nodeDefinitions,
  fromGlobalId
} from 'graphql-relay'

const { nodeInterface, nodeField } = nodeDefinitions(
  // resolve the ID to an object
  (globalId, context, resolveInfo) => {
    // parse the globalID
    const { type, id } = fromGlobalId(globalId)

    // pass the type name and other info. `joinMonster` will find the type from the name and write the SQL
    return joinMonster.getNode(type, resolveInfo, context, parseInt(id),
      sql => knex.raw(sql)
    )
  },
  // determines the type. Join Monster places that type onto the result object on the "__type__" property
  obj => obj.__type__
)

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    // expose the Node type on the root-level
    node: nodeField,
    users: {...}
  })
})
```

The `getNode` method needs the type name, resolve info, a context object, the value of the `primaryKey`, and a function the receives the SQL and queries the database. If the `primaryKey` is composite, an array is needed for the fourth argument. See [API](/API/#getNode) for details

The Node interface also needs to resolve its type, which join monster figures out for you. It places the type on the `"__type__"` property of the resolved data. When you write the `resolveType` function, the second argument for `nodeDefinitions`, you can simply return the object on the `"__type__"` property.

Your global ID may not be the same as the `uniqueKey`. Or you might have more complex logic for retrieving the node from the global ID. For these cases you can pass a [where](/API/#where) function as your fourth argument instead of a value directly. This function generates the `WHERE` condition dynamically. Be sure to escape untrusted user input.

```javascript
const { nodeInterface, nodeField } = nodeDefinitions(
  // resolve the ID to an object
  (globalId, context, resolveInfo) => {
    // parse the globalID
    const { type, id } = fromGlobalId(globalId)

    // pass a function to generate the WHERE condition, instead of simply passing a value
    return joinMonster.getNode(type, resolveInfo, context,
      table => `${table}.id = ${id}`,
      sql => knex.raw(sql)
    )
  },
  // determines the type. Join Monster places that type onto the result object on the "__type__" property
  obj => obj.__type__
)
```
