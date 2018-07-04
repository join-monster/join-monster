## Correlating Fields to Columns

You'll need to provide a bit of information about each column and its relationship to the table, if any. For fields with a one-to-one correspondence, use the `sqlColumn` property.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    id: {
      // the column name is assumed to be the same as the field name
      type: GraphQLInt
    },
    email: {
      type: GraphQLString,
      // if the column name is different, it must be specified
      sqlColumn: 'email_address'
    },
    idEncoded: {
      description: 'The ID base-64 encoded',
      type: GraphQLString,
      sqlColumn: 'id',
      // this field uses a sqlColumn and applies a resolver function on the value
      // if a resolver is present, the `sqlColumn` MUST be specified even if it is the same name as the field
      resolve: user => toBase64(user.id)
    }
  })
})

function toBase64(clear) {
  return Buffer.from(String(clear)).toString('base64')
}
```

In the case of the `id` field, the `sqlColumn` was omitted. Since it has no resolver, it is assumed to have to come from the table and the column name is assumed to be the same as the field name. The same inference is not made if a resolver is present.

<div class="admonition note">
  <p class="first admonition-title">Note</p>
  <p class="last">
    Some external libraries add resolvers to your schema, such as <a href="https://github.com/apollographql/optics-agent-js">Optics</a>, or the <code>logger</code> option in <a href="https://github.com/apollographql/graphql-tools">graphql-tools</a>.
    If using one of these, <code>sqlColumn</code> cannot be omitted.
  </p>
</div>

## Computed Columns

You can manipulate the data in your query without losing the benefit of batched requests.

Maybe your field(s) needs a SQL column to compute a value. If there isn't a simple one-to-one correspondence of columns to field, you can use `sqlDeps`. `sqlDeps` is an array of columns that will get retrieved if the GraphQL field is requested. These are exposed to your resolver, so you can write a `resolve` function to compute a value in JavaScript. For example, a `first_name` and `last_name` column can be *depended on* for a `fullName` field in your API.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    fullName: {
      description: 'A user\'s first and last name',
      type: GraphQLString,
      // perhaps there is no 1-to-1 mapping of field to column
      // this field depends on multiple columns
      sqlDeps: [ 'first_name', 'last_name' ],
      resolve: user => `${user.first_name} ${user.last_name}`
    }
  })
})
```

You can also do computed columns in the SQL itself with a *raw expression* using `sqlExpr`. This is a function that generated the expression. Its parameters are the table alias (generated automatically by joinMonster), the GraphQL arguments on that field,  and a [context](/where/#adding-context) object.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    capitalizedLastName: {
      type: GraphQLString,
      // do a computed column in SQL with raw expression
      sqlExpr: (table, args) => `UPPER(${table}.last_name)`
    },
    fullNameAnotherWay: {
      description: 'Another way we can get the full name.',
      type: GraphQLString,
      sqlExpr: table => `${table}.first_name || ' ' || ${table}.last_name`
    },
  })
})
```

