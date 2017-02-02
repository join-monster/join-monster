## Demo

Join Monster works well with [graphql-relay-js](https://github.com/graphql/graphql-relay-js). Check out the Relay-compliant [version of the demo](https://join-monster.herokuapp.com/graphql-relay?query=%7B%0A%20%20node(id%3A%20%22VXNlcjoy%22)%20%7B%0A%20%20%20%20...%20on%20User%20%7B%20id%2C%20fullName%20%7D%0A%20%20%7D%0A%20%20user(id%3A%202)%20%7B%0A%20%20%20%20id%0A%20%20%20%20fullName%0A%20%20%20%20posts(first%3A%202%2C%20after%3A%20%22eyJpZCI6NDh9%22)%20%7B%0A%20%20%20%20%20%20pageInfo%20%7B%0A%20%20%20%20%20%20%20%20hasNextPage%0A%20%20%20%20%20%20%20%20startCursor%0A%20%20%20%20%20%20%20%20endCursor%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20cursor%0A%20%20%20%20%20%20%20%20node%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20body%0A%20%20%20%20%20%20%20%20%20%20comments%20(first%3A%203)%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20pageInfo%20%7B%20hasNextPage%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20node%20%7B%20id%2C%20body%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A). Source code can be found [here](https://github.com/stems/join-monster-demo/tree/master/schema-relay).

**Note:** Although Join Monster uses the [Relay Connection spec](https://facebook.github.io/relay/graphql/connections.htm) for paginated fields in your API, you certainly do not have to use Relay to paginate. You also have several options for how it is implemented on the back-end, such as "offsets" or "cursors". Due to the Relay spec's use of the term "cursor" we will refer to actual cursor-based pagination as "keyset pagination" to avoid clashing names.

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
    return joinMonster.getNode(type, resolveInfo, context, id,
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

The `getNode` method needs the type name, resolve info, a context object, the value of the `primaryKey`, and a function the receives the SQL and queries the database. If the `primaryKey` is composite, an array is needed for the fourth argument. See [API](/API/#getNode) for details

The Node interface also needs to resolve its type, which join monster figures out for you. It places the type on the `"__type__"` property of the resolved data. When you write the `resolveType` function, the second argument for `nodeDefinitions`, you can simply return the object on the `"__type__"` property.

Your global ID may not be the same as the `uniqueKey`. Or you might have more complex logic for retrieving the node from the global ID. For these cases you can pass a [where](/API/#where) function as your fourth argument instead of a value directly. This function generates the WHERE condition dynamically.

```javascript
const { nodeInterface, nodeField } = nodeDefinitions(
  // resolve the ID to an object
  (globalId, context, resolveInfo) => {
    // parse the globalID
    const { type, id } = fromGlobalId(globalId)

    // get name of unique key defined on table
    // NOTE: This does not work with composite keys
    const uniqueKey = resolveInfo.schema.getType(type)._typeConfig.uniqueKey

    // pass a function to generate the WHERE condition, instead of simply passing a value
    return joinMonster.getNode(type, resolveInfo, context,
      table => `${table}.${uniqueKey} = ${id}`,
      sql => knex.raw(sql)
    )
  },
  // determines the type. Join Monster places that type onto the result object on the "__type__" property
  obj => obj.__type__
)
```

## Connection Types

Join Monster works with Relay's specification for connection types by providing **3 implementations** of pagination. You can choose the best option for your needs.

### 1. Application-layer Paging

The simplest approach is to do it on the web server. In this approach, Join Monster will handle it by requesting all the objects like it would for a `GraphQLList` type. When you have all the objects in memory, you can implement your own pagination logic in the resolver. To do this, your field should have a connection type which will be automatically detected by Join Monster. How? If all of the following are true:

1. The field is a `GraphQLObjectType`.
1. The type has a `pageInfo` field.
1. The type has an `edges` field.

To demonstrate this, we can import the helpers from [graphql-relay-js](https://github.com/graphql/graphql-relay-js).

```javascript
import {
  globalIdField,
  connectionArgs,
  connectionDefinitions,
  connectionFromArray
} from 'graphql-relay'

import Post from './Post'
import Comment from './Comment'

// wrap these types in a `Connection` type
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
      // accept the standard args for connections, e.g. `first`, `after`...
      args: connectionArgs,
      // joinMonster give us an array, use the helper to slice the array based on the args
      resolve: (user, args) => {
        return connectionFromArray(user.comments, args)
      },
      // write the JOIN as you normally would
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

The `type`, `args`, and `resolve` are made simple with these helpers, but can all be done manually. In a manner similar to prior examples, we need to tell Join Monster how to get the data with a `JOIN`. Both **one-to-many** and **many-to-many** are supported. Place either the `sqlJoin` or `sqlJoins` alongside the connection type and you're ready to handle requests for paginated data.

| Pros | Cons |
| ---- | ---- |
| simple setup | not scalable to large amounts of data |
| write your own custom paging logic |  |
| portable to all SQL dialects |  |

[See example](https://github.com/stems/join-monster/blob/master/example/schema-relay-standard/User.js)

### 2. Integer Offset Paging

This approach is based of the `OFFSET` keyword in SQL – often used to get numbered pages. It uses a predictable, position-based integer that determines how many rows to skip on a sorted set. To use it, you must choose a stable sort based on one or multiple columns. Tell Join Monster you want to use this method by adding two properties to the field. Set `sqlPaginate` to `true`. Set `orderBy` to tell it how to sort.

```javascript
const User = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    comments: {
      // this is now a connection type
      type: CommentConnection,
      args: forwardConnectionArgs,
      // tell join monster to paginate the queries
      sqlPaginate: true,
      // specify what to order on
      orderBy: 'id',
      // join is the same as before
      sqlJoin: (userTable, commentTable) => `${userTable}.id = ${commentTable}.author_id`
    }
  })
})
```

This will order by the `'id'`, defaulting to ascending ordering. If you want *descending*, or you need multiple sort columns, expand the `orderBy` property to an object.

```javascript
const User = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    comments: {
      type: CommentConnection,
      // this time only forward pagination works
      args: forwardConnectionArgs,
      sqlPaginate: true,
      // orders on both `created_at` and `id`. the first property is the primary sort column.
      // it only sorts on `id` if `created_at` is equivalent
      orderBy: {
        created_at: 'desc',
        id: 'asc'
      },
      sqlJoin: (userTable, commentTable) => `${userTable}.id = ${commentTable}.author_id`
    }
  })
})
```

If your sort columns are **dynamic**, you can make `orderBy` a *function* that return the `orderBy` value. This function will receive the GraphQL arguments as the first parameter.

Join Monster will only pull the rows for the requested page out of the database. Because it uses the `LIMIT`, `OFFSET` clauses, the pages will get shifted if a new row is inserted at the beginning. We also cannot do backward pagination because the total number of rows is required for calculation of the offset. Although the total is known *after* the query is made, it is not available when we need to calculate the offset.

However, you do have the ability to navigate to any page in the middle. **The Relay Cursor contains the offset.** You can produce the cursor for any row in the middle because you can predict the offset value. `graphql-relay` has a helper for this. For example:

```javascript
import { offsetToCursor } from 'graphql-relay'

let cursor = offsetToCursor(9)

// jump straight to page 3!
let query = `{
  user(id: 1) {
    posts(first: 5, after: "${cursor}") {
      pageInfo {
        endCursor
        total
      }
      edges {
        node { body }
      }
    }
  }
}`
```

Another advantage is that the total number of items in the list is returned from batch request. Notice how the total was requested. Join Monster provides this to the connection's resolver on the `total` property on `pageInfo`. This is useful for calculating the total number of pages. Watch out though, the `connectionDefinitions` helper from `graphql-relay` *does not* provide this field. You have to add it manually to the schema if you want to expose it. Join Monster automatically fetches it either way.

Because the cursor is predictable, you get another interesting capability. You can traverse the pages of **multiple** instances of the parent types simultaneously, a.k.a. "recursive paging". For example, you can get multiple users, page 2 of each user's posts, **AND** page 2 of each post's comments. For example:

```gql
{
  users(first: 5) {
    edges {
      node {
        id, fullName
        posts(first: 5, after: "YXJyYXljb25uZWN0aW9uOjk=") {
          edges {
            node {
              id, body
              comments(first: 5, after: "YXJyYXljb25uZWN0aW9uOjk=") {
                edges {
                  node {
                    id, body
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

This is possible because the 10th post *always* has the same cursor value, regardless of which user it belongs too. This is also true for comments or any other type. But because offsets work by skipping rows from the beginning, backward pagination is not possible.

This approach relies on the `LATERAL` keyword in the SQL standard. Despite being in the standard, it is not supported on all implementations. To use it, you must opt-in to the `pg` dialect in the [options](/API/#joinMonster).

| Pros | Cons |
| ---- | ---- |
| only fetch the current page from the database | only supported in the `pg` dialect |
| total number of pages can be known | unstable - shifts the items if insertions are made at the beginning |
| jump to arbitrary pages in the middle | requires sorting the table, which can be expensive for very large data sets |
| able to "recursively" page through multiple nested connections | unable to do backward paging |

[See example](https://github.com/stems/join-monster/blob/master/example/schema-relay-paginate-1/User.js)


### 3. Keyset Paging

This approach utilizes a **sort key**, either one column or multiple columns together that are sortable *and* unique. The uniqueness allows us to place the sort key into the cursor to uniquely identify each object. We can use a `WHERE` in lieu of an `OFFSET`. These queries can be executed without sorting the whole table, but instead with a B-Tree index scan of the sort key. It is the most scalable approach, but also the most limiting. Tell Join Monster to use this by setting two properties. Again, set `sqlPaginate` to `true`. Set `sortKey` to an object with an order direction and the key (which is either the name of the column or an array of column names).

```javascript
const User = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    comments: {
      // this is now a connection type
      type: CommentConnection,
      args: connectionArgs,
      sqlPaginate: true,
      // orders on both `created_at` and `id`. the first property is the primary sort column.
      // it only sorts on `id` if `created_at` is equivalent
      sortKey: {
        order: 'desc',
        key: 'id'
      },
      sqlJoin: (userTable, commentTable) => `${userTable}.id = ${commentTable}.author_id`
    }
  })
})
```

You can make the `sortKey` dynamic by making it a function that returns the sort key object instead. This function will take the GraphQL args as the first parameter.

The cursors will be formed from the sort key, which is the `'id'`. This cursor is not predictable, so we lose the ability to jump to pages in the middle. We also don't know the total number. However, we *can* page backwards.

<div class="admonition danger">
  <p class="first admonition-title">Warning</p>
  <p class="last">
    One must make sure the sort key is <strong>unique</strong>. If it is not, rows will be <em>silently skipped</em>. 
  </p>
</div>

 It is not recommended to use timestamps as the sort key. Even if they appear to be unique in the database, they may become non-unique if coerced to JavaScript `Date` objects. PostgreSQL's `timestamp`, for example, has microsecond precision. JavaScript's date object has only millisecond precision, meaning you can lose up to 3 decimal points by converting. Some libraries will try be helpful by doing this conversion automatically. In doing so, two timestamps which differ by only microseconds can become the same after being truncated as a JavaScript `Date`. Use an integer `id` as the sort key if you can. If your `id` does not produce the desired sort order (like a `uuid`), you can use a composite of a `timestamp` and an `id` to make it unique.

```javascript
const User = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    comments: {
      // this is now a connection type
      type: CommentConnection,
      args: connectionArgs,
      sqlPaginate: true,
      // orders on both `created_at` and `id`. the first property is the primary sort column.
      // it only sorts on `id` if `created_at` is equivalent
      sortKey: {
        order: 'desc',
        key: [ 'created_at', 'id' ]
      },
      sqlJoin: (userTable, commentTable) => `${userTable}.id = ${commentTable}.author_id`
    }
  })
})
```

Because the cursor identifies it's object by a key, it will not be tripped up by insertions at the beginning. However, this uniqueness removes the possibility of "recursive paging" with nested connections, since each list of posts has a different sequence of cursors. You can still get the beginning or end of nested connections though.

```gql
{
  users(first: 5) {
    edges {
      node {
        id, fullName
        posts(first: 5) {
          edges {
            node {
              id, body
              comments(first: 5) {
                edges {
                  node {
                    id, body
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

This also uses the `LATERAL` keyword. Using it requires opting in to the `pg` dialect.

| Pros | Cons |
| ---- | ---- |
| only fetch the current page from the database | only supported in the `pg` dialect |
| most scalable with proper index scans on sort key | no jumping to middle pages |
| stable - handles insertions in the middle of the list | total page number not known |
|  | unable to do "recursive paging" |

[See example](https://github.com/stems/join-monster/blob/master/example/schema-relay-paginate-2/User.js)

