## Specify the SQL Table and Its Unique Key

We'll add a couple of properties to the `GraphQLObjectType` definition on `User`. Our users data lives in the `accounts` table, so we'll set the `sqlTable` property to `'accounts'`.

If we ever request a `GraphQLList` of `User`s, we need to be a unique identifier so it's unambiguous which objects are distinct entities  and which were duplicated due to a join. Our `accounts` table has a primary key, the `'id'`, so we'll set that as the `uniqueKey` property. This isn't required if we never get a list of users, but we recommend adding it anyways in the event that you add such a field later.

```javascript
const User = new GraphQLObjectType({
  name: 'User',
  sqlTable: 'accounts', // the SQL table for this object type is called "accounts"
  uniqueKey: 'id', // only required if we ever retrieve a GraphQLList of User types. Used for de-duplication
  fields: () => ({ /*...*/ })
})
```
