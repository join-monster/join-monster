## Demo

Check out the paginated [version of the demo](https://join-monster.herokuapp.com/graphql-relay?query=%7B%0A%20%20node(id%3A%20%22VXNlcjoy%22)%20%7B%0A%20%20%20%20...%20on%20User%20%7B%20id%2C%20fullName%20%7D%0A%20%20%7D%0A%20%20user(id%3A%202)%20%7B%0A%20%20%20%20id%0A%20%20%20%20fullName%0A%20%20%20%20posts(first%3A%202%2C%20after%3A%20%22eyJpZCI6NDh9%22)%20%7B%0A%20%20%20%20%20%20pageInfo%20%7B%0A%20%20%20%20%20%20%20%20hasNextPage%0A%20%20%20%20%20%20%20%20startCursor%0A%20%20%20%20%20%20%20%20endCursor%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20cursor%0A%20%20%20%20%20%20%20%20node%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20body%0A%20%20%20%20%20%20%20%20%20%20comments%20(first%3A%203)%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20total%0A%20%20%20%20%20%20%20%20%20%20%20%20pageInfo%20%7B%20hasNextPage%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20node%20%7B%20id%2C%20body%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A).
Source code can be found [here](https://github.com/stems/join-monster-demo/tree/master/schema-paginated).

Join Monster supports three different implementations of pagination, each of which can be combined with either `sqlJoin` or `sqlBatch` strategies to fetch the paginated field.
Paginated fields are expected to be `GraphQLList` types wrapped in a **Connection** object type.
This is the same as the [Relay Connection spec](https://facebook.github.io/relay/graphql/connections.htm) for paginated fields.
This [Stack Overflow Answer](http://stackoverflow.com/questions/42622912/in-graphql-whats-the-meaning-of-edges-and-node) summarizes this nicely.
You certainly do not have to use Relay on the client.
Join Monster happens to use this interface because it's a convenient standard.
It also allows us to leverage [graphql-relay-js](https://github.com/graphql/graphql-relay-js). Again, this package is **does not require** you to use Relay on the client. It's simply a module for helping to set up Relay-compliant GraphQL APIs—of which pagination is a part of.


**Not all dialects support every type of pagination.** Check the [dialects](/dialects) page for current pagination support for each dialect.


### 1. Application-layer Paging

The simplest approach is to do it on the web server.
In this approach, Join Monster will handle it by requesting all the objects like it would for a `GraphQLList` type.
When you have all the objects in memory, you can implement your own pagination logic in the resolver.

To do this, your field should have a connection type which will be automatically detected by Join Monster.
How? If all of the following are true:

1. The field is a `GraphQLObjectType`.
1. The type has a `pageInfo` field.
1. The type has an `edges` field.

To demonstrate this, we can import the helpers from [graphql-relay-js](https://github.com/graphql/graphql-relay-js).

```javascript
import {
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
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          sqlColumn: 'id'
        }
      }
    },
    comments: {
      type: CommentConnection,
      // accept the standard args for connections, e.g. `first`, `after`...
      args: connectionArgs,
      extensions: {
        joinMonster: {
          // write the JOIN as you normally would. you can do a `sqlBatch` instead
          sqlJoin: (userTable, commentTable) =>
            `${userTable}.id = ${commentTable}.author_id`
        }
      },
      // joinMonster give us an array, use the helper to slice the array based on the args
      resolve: (user, args) => {
        return connectionFromArray(user.comments, args)
      }
    },
    posts: {
      type: PostConnection,
      args: connectionArgs,
      extensions: {
        joinMonster: {
          sqlJoin: (userTable, postTable) =>
            `${userTable}.id = ${postTable}.author_id`
        }
      },
      resolve: (user, args) => {
        return connectionFromArray(user.posts, args)
      }
    }
  })
})
```

The `type`, `args`, and `resolve` are made simple with these helpers, but can all be done manually. In a manner similar to prior examples, we need to tell Join Monster how to get the data with a `JOIN`. Both **one-to-many** and **many-to-many** are supported. Place either the `sqlJoin` or `sqlJoins` alongside the connection type and you're ready to handle requests for paginated data.

| Pros | Cons |
| ---- | ---- |
| simple setup | not scalable to large amounts of data |
| write your own custom paging logic |  |
| portable to all SQL dialects |  |


### 2. Integer Offset Paging

This approach is based of the `OFFSET` keyword in SQL – often used to get numbered pages.
It uses a predictable, position-based integer that determines how many rows to skip on a sorted set.

To use it, you must provide a connection type and choose a stable sort based on one or multiple columns.
Tell Join Monster you want to use this method by adding two properties to the field.
Set `sqlPaginate` to `true`. Set ([thunked](/API/#thunk)) `orderBy` to tell it how to sort.

```javascript
import { forwardConnectionArgs } from 'graphql-relay'

const User = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    comments: {
      // this is now a connection type
      type: CommentConnection,
      // this implementation only supports forward pagination
      args: forwardConnectionArgs,
      extensions: {
        joinMonster: {
          // tell join monster to paginate the queries in SQL
          sqlPaginate: true,
          // specify what to order on
          orderBy: 'id',
          // join is the same as before
          sqlJoin: (userTable, commentTable) =>
            `${userTable}.id = ${commentTable}.author_id`
          // or you could have used batching
          //sqlBatch: {
          //  thisKey: 'author_id',
          //  parentKey: 'id'
          //}
        }
      }
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
      extensions: {
        joinMonster: {
          sqlPaginate: true,
          // orders on both `created_at` and `id`. the first property is the primary sort column.
          // it only sorts on `id` if `created_at` is equivalent
          orderBy: [
            { column: 'created_at', direction: 'desc' },
            { column: 'id', direction: 'asc' }
          ],
          sqlJoin: (userTable, commentTable) =>
            `${userTable}.id = ${commentTable}.author_id`
        }
      }
    }
  })
})
```

If your sort columns are **dynamic**, you can make `orderBy` a *function* that return the `orderBy` value. This function will receive the GraphQL arguments as the first parameter.

Join Monster will only pull the rows for the requested page out of the database. Because it uses the `LIMIT`, `OFFSET` clauses, the pages will get shifted if a new row is inserted at the beginning. We also cannot do backward pagination because the total number of rows is required for calculation of the offset.

However, you do have the ability to navigate to any page in the middle.
**The Relay Cursor contains the offset** and is therefore predictable.
You can produce the cursor for any row in the middle because you can predict the offset value.
`graphql-relay` has a helper for this. For example:

```javascript
import { offsetToCursor } from 'graphql-relay'

let cursor = offsetToCursor(9)

// jump straight to page 3!
let query = `{
  user(id: 1) {
    posts(first: 5, after: "${cursor}") {
      pageInfo {
        endCursor
      }
      total
      edges {
        node { body }
      }
    }
  }
}`
```

Another advantage is that the total number of items in the list is returned from batch request.
Notice how the total was requested.
Join Monster provides this to the connection's resolver on the `total` property on the Connection.
This is useful for calculating the total number of pages. Watch out though, the `connectionDefinitions` helper from `graphql-relay` *does not* provide this field.
You have to add it manually to the schema if you want to expose it.
Join Monster automatically fetches it either way.

```javascript
// define the comment connection a little differently this time. add the total
const { connectionType: CommentConnection } = connectionDefinitions({
  nodeType: Comment,
  connectionFields: {
    total: { type: GraphQLInt }
  }
})
```

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

This implementation is not supported on all dialects. See the [dialects](/dialects) page for details.

| Pros | Cons |
| ---- | ---- |
| only fetch the current page from the database | only supported in some dialects |
| total number of pages can be known | unstable - shifts the items if insertions are made at the beginning |
| jump to arbitrary pages in the middle | requires sorting the table, which can be expensive for very large data sets |
| able to "recursively" page through multiple nested connections | unable to do backward paging |



### 3. Keyset Paging

This approach utilizes a **sort key**, either one column or multiple columns together that are sortable *and* unique.
The uniqueness allows us to place the sort key into the cursor to uniquely identify each object.
We can use a `WHERE` in lieu of an `OFFSET`, which can benefit performance.
It is the most scalable approach, but also the most limiting.
Tell Join Monster to use this by providing a connection type and setting two properties.
Again, set `sqlPaginate` to `true`. Set ([thunked](/API/#thunk)) `sortKey` to an object with an order direction and the key (which is either the name of the column or an array of column names).

```javascript
const User = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    posts: {
      description: 'A list of Posts the user has written',
      // this is now a connection type
      type: PostConnection,
      args: connectionArgs,
      extensions: {
        joinMonster: {
          sqlPaginate: true,
          // use "keyset" pagination, an implementation based on a unique sorting key
          // they will be sorted on `id` descending.
          sortKey: {
            order: 'DESC',
            key: 'id'
          },
          sqlJoin: (userTable, postTable) =>
            `${userTable}.id = ${postTable}.author_id`
        }
      }
    }
  })
})
```

You can make the `sortKey` dynamic by making it a function that returns the sort key array instead. This function will take the GraphQL args as the first parameter.

The cursors will be formed from the sort key, which in the example above is the `'id'`. This cursor is not predictable, so we lose the ability to jump to pages in the middle. We also don't know the total number. However, we _can_ page backwards, and, the database is able to use an index (if available) to jump right to the records it needs for whatever page is being requested.

<div class="admonition danger">
  <p class="first admonition-title">Warning</p>
  <p class="last">
    One must make sure the sort key is <strong>unique</strong>. If it is not, rows will be <em>silently skipped</em>.
  </p>
</div>

It is not recommended to use timestamps as the sort key. Even if they appear to be unique in the database, they may become non-unique if coerced to JavaScript `Date` objects. PostgreSQL's `timestamp`, for example, has microsecond precision. JavaScript's date object has only millisecond precision, meaning you can lose up to 3 decimal points by converting. Some libraries will try be helpful by doing this conversion automatically. In doing so, two timestamps which differ by only microseconds can become the same after being truncated as a JavaScript `Date`. Use an integer `id` as the sort key if you can. If your `id` does not produce the desired sort order (like a `uuid`), you can use a composite of a `timestamp` and an `id` to make it unique.

You can also use compound sort keys. To do so, pass more than one `{column, direction}` pair as `sortKey` property (or the result of the sortKey function):

```javascript
const User = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    comments: {
      // this is now a connection type
      type: CommentConnection,
      args: connectionArgs,
      extensions: {
        joinMonster: {
          sqlPaginate: true,
          // orders on both `created_at` and `id`. the first property is the primary sort column.
          // the database will only sort on `id` if `created_at` is equivalent
          sortKey: [
            { column: 'created_at', direction: 'desc' },
            { column: 'id', direction: 'asc' }
          ],
          sqlJoin: (userTable, commentTable) =>
            `${userTable}.id = ${commentTable}.author_id`
        }
      }
    }
  })
})
```

When used with other arguments to the field, this is useful for paginating dynamically sorted connections.

Because the cursor identifies its object by a key, it will not be tripped up by insertions at the beginning. However, this uniqueness removes the possibility of "recursive paging" with nested connections, since each list of posts has a different sequence of cursors.
You can still get the beginning or end of nested connections though.

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


| Pros | Cons |
| ---- | ---- |
| only fetch the current page from the database | only supported in some dialects |
| most scalable with proper index scans on sort key | no jumping to middle pages |
| stable - handles insertions in the middle of the list | total page number not known |
| both forward and backward paging | unable to do "recursive paging" |

## Pagination with Batching

All implementations support batching instead of joins. Simply combine the applicable properties with either `sqlBatch` or `junction.sqlBatch`.


```javascript
const Post = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    comments: {
      type: CommentConnection,
      args: connectionArgs,
      extensions: {
        joinMonster: {
          sqlPaginate: true,
          sortKey: [{ column: 'created_at', direction: 'desc' }],
          sqlBatch: {
            // which column to match up to the users
            thisKey: 'post_id',
            // the other column to compare to
            parentKey: 'id'
          },
          where: table => `${table}.archived = FALSE`
        }
      }
    }
  })
})
```

## LIMIT without pagination

If you just want to limit the number of results in a list field, but don't want the Connection type and arguments,
you can just use the ([thunked](/API/#thunk)) `limit` and `orderBy` properties on that field.

```javascript
const Post = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    only3Comments: {
      type: new GraphQLList(Comment),
      extensions: {
        joinMonster: {
          orderBy: { id: 'desc' },
          limit: 3,
          sqlJoin: (userTable, commentTable) =>
            `${commentTable}.author_id = ${userTable}.id`
        }
      }
    }
  })
})
```

The `limit` can be an integer or a function that returns an integer. This feature is only supported if pagination is supported for you SQL dialect.

### 4. Max and Default Page Size in Pagination

If you want to limit the maximum number of results allowed in a list field,
you can use the `sqlPageLimit`.
To set a default page size use `sqlDefaultPageSize`. without a sqlDefaultPageSize, server defaults to a max limit as per the db in use.

```javascript
const Post = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    only3Comments: {
      type: new GraphQLList(Comment),
      extensions: {
        joinMonster: {
          sqlPaginate: true,
          sqlPageLimit: 100,
          sqlDefaultPageSize: 5,
          ...
        }
      }
    }
  })
})
```

The `sqlPageLimit` and `sqlDefaultPageSize` fields are integers. This feature is only supported if pagination is supported for your SQL dialect and sqlPaginate is set.
