## Correlating Fields to Columns

You'll need to provide a bit of information about each column and its relationship to the table, if any. For fields with a one-to-one correspondence, use the `sqlColumn` property. If a field "depends" on multiple columns, use `sqlDeps`.

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
    }
  })
})

function toBase64(clear) {
  return Buffer.from(String(clear)).toString('base64')
}
```

In the case of the `id` field, the `sqlColumn` was omitted. Since it has no resolver, it is assumed to have to come from the table and the column name is assumed to be the same as the field name. The same inference is not made if a resolver is present.
