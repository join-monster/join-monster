## Mapping Union Types

GraphQL has the `GraphQLUnionType`, which allows for polymorphic fields.
After resolving the values for these fields, you must also resolve the type, to figure out which of the base types it ends up being.
Similar to the `GraphQLObjectType`, Join Monster maps these to a SQL table.
However, it's more likely that these will be VIEWs or *derived tables*.

This table must also have a key, which can be composite.
There is one additional requirement for this table.
**The table must provide all the columns with the same names as the tables for each type it contains.**
For example, suppose you have a `GraphQLUnionType` of types `Foo` and `Bar`.
If table `foo` has columns `a` and `b` and table `bar` has columns `a` and `c`, the table for the union type must provide columns `a`, `b`, and `c`.

```js
const FooBar = new GraphQLUnionType({
  name: 'FooBar',
  types: [Foo, Bar],
  extensions: {
    joinMonster: {
      // a derived table that combines the two tables into one via a UNION
      sqlTable: `(
        SELECT
          a,
          b,
          NULL as c
        FROM foo
        UNION
        SELECT
          a,
          NULL as b,
          c
        FROM bar
      )`,
      // specify unique key
      uniqueKey: 'a'
    }
  },
  resolveType: () => {
    /* TODO */
  }
})
```

Inserting `NULL` in place of differing columns can reconcile two incongruous tables.

We assumed `a` was unique across both tables.
This will not always be the case.
Let's see how one might handle this in our example schema.
Suppose we want to get a list of everything a user has written.
So we create an `Authored` type to union `Post` and `Comment`.

Let's not assume the `id` columns are not unique once unioned together.
We could add a computed column to guarantee a unique value. There is, however, something more useful we can do.

```js
const Authored = new GraphQLUnionType({
  name: 'Authored',
  types: () => [Comment, Post],
  extensions: {
    joinMonster: {
      sqlTable: `(
        SELECT
          id,
          body,
          author_id,
          NULL AS post_id,  -- post has no post_id, so fill that in with NULL
          'Post' AS "$type"
        FROM posts
        UNION ALL
        SELECT
          id,
          body,
          author_id,
          post_id,
          'Comment' AS "$type"
        FROM comments
      )`,
      // the combination of `id` and `$type` will always be unique
      uniqueKey: ['id', '$type']
    }
  },
  resolveType: obj => {
    /* TODO */
  }
})
```

We can introduce a new column `"$type"` to not only provide a basis for a unique (composite) key, but also to disambiguate which object type each object should resolve to.
This **will** address the uniqueness problem, but the actual hydrated data will not contain the `"$type"` (as it was not requested in the GraphQL query), so we cannot yet reference it in `resolveType`.
Join Monster provides an optional `alwaysFetch` property which forces that column to always appear in the hydrated data. You can use this to implement `resolveType`.

```js
const Authored = new GraphQLUnionType({
  name: 'Authored',
  types: () => [Comment, Post],
  extensions: {
    joinMonster: {
      sqlTable: `(...)`,
      uniqueKey: ['id', '$type'],
      // tells join monster to always fetch the $type in the hydrated data
      alwaysFetch: '$type'
    }
  },
  // easily gleaned from the column we added in SQL
  resolveType: obj => obj.$type
})
```

## Interface Types

The `Post` and `Comment` types share the `body` and `author_id` fields.
It is also feasible to implement `Authored` as a `GraphQLInterfaceType`.
This is GraphQL's other option for polymorphic types, but it has shared fields which must appear on all types that claim to implement that interface.
Join Monster treats these nearly the same.
The difference is that you must decorate the `fields` on the interface type defintion.

```js
const Authored = new GraphQLInterfaceType({
  name: 'Authored',
  extensions: {
    joinMonster: {
      sqlTable: `(
        SELECT
          id,
          body,
          author_id,
          NULL AS post_id,
          'Post' AS "$type"
        FROM posts
        UNION ALL
        SELECT
          id,
          body,
          author_id,
          post_id,
          'Comment' AS "$type"
        FROM comments
      )`,
      // the combination of `id` and `$type` will always be unique
      uniqueKey: ['id', '$type'],
      alwaysFetch: '$type'
    }
  },
  fields: () => ({
    id: {
      // still assumed to have the same column name as the field name
      type: GraphQLInt
    },
    body: {
      type: GraphQLString
    },
    authorId: {
      type: GraphQLInt,
      extensions: {
        joinMonster: {
          // but this column name is different
          sqlColumn: 'author_id'
        }
      }
    }
  }),
  resolveType: obj => obj.$type
})
```

## Placing on a Field

These types are used just as any other `GraphQLObjectType` that is mapped to a table. That is, if it appears as a child field on another `GraphQLObjectType` which is also mapped to a table, Join Monster expects a `JOIN` condition(s) or batch keys.

```js
const User = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    writtenMaterial: {
      type: new GraphQLList(Authored),
      extensions: {
        joinMonster: {
          orderBy: 'id',
          // how to join on the derived table
          sqlJoin: (userTable, unionTable) =>
            `${userTable}.id = ${unionTable}.author_id`
          // or we could have done it in a batch
          // sqlBatch: {
          //   thisKey: 'author_id',
          //   parentKey: 'id'
          // }
        }
      }
    }
  })
})
```

So now we can handle queries like this!

```graphql
{
  user(id: 1) {
    writtenMaterial {
      __typename
      id
      body
      authorId
      ... on Comment {
        postId
        likers {
          fullName
        }
      }
    }
  }
}
```

## Relay's Node Interface

Join Monster provides a vastly more convenient helper function for Relay's Node Interface. See [this page](/relay/#node-interface) in the docs.
