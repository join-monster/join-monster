## Using the Function

We haven't actually seen the module get used yet...

Import `joinMonster`. Have the top-most field that maps to a SQL table implement a resolver function that calls `joinMonster`. Simply pass it the AST info (this includes the parsed query and your schema definition), a "context" object (which can be empty for now), and a callback that takes the SQL as a parameter, calls the database, and returns the data (or a `Promise` of the data). The data must be an array of objects where each object represents a row in the result set.

```javascript
import joinMonster from 'join-monster'

const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: {
      type: new GraphQLList(User),
      resolve: (parent, args, context, ast) => {
        return joinMonster(ast, {}, sql => {
          // knex is a SQL query library for NodeJS. This method returns a `Promise` of the data
          return knex.raw(sql)
        })
      }
    }
  })
})
```

### joinMonster(astInfo, context, dbCall) ⇒ `Promise<Object>`
Takes the GraphQL AST and returns a nest Object with the data.

**Returns**: <code>Promise.&lt;Object&gt;</code> - The correctly nested data from the database.

| Param | Type | Description |
| --- | --- | --- |
| astInfo | <code>Object</code> | Contains the parsed GraphQL query, schema definition, and more. Obtained form the first argument to the resolver. |
| context | <code>Object</code> | An arbitrary object that gets passed to the where function. Useful for contextual infomation that influeces the  WHERE condition, e.g. session, logged in user, localization. |
| dbCall | <code>function</code> | A function that is passed the compiled SQL that calls the database and returns (a promise of) the data. |

### `dbCall(sql, [done])` -> `Promise<Array<Objects>>`

**Params:**

| Name | Type | Description |
| ---- | ---- | ----------- |
| sql  | String | The SQL that Join Monster generated. Use it to query your database. |
| [done] | Function | If you do not return a `Promise`, you must include a second parameter. This is an error-first callback. If successful, pass it the data from the database.

**Returns:**

Array of objects, where each object is a row from the table. For example:
```javascript
[
  { id: 1, email_address: 'andrew@stem.is', post__id: 13, post__body: 'Hello world.' },
  { id: 2, email_address: 'matt@stem.is', post__id: 15, post__body: 'Make it less side-effecty!' }
]
```


## Accessing Your Database

You'll need to set up the connection to the database. For the provided [example](https://github.com/stems/join-monster-demo), there is a small SQLite3 file provided at `/data/demo-data.sl3`. You can import `knex` and load the data like this.
```javascript
const dataFilePath = 'path/to/the/data.sl3' // make this the path to the database file
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: dataFilePath
  }
})
```

You're ready to handle queries on the `Users`!
```graphql
{
  users { id, idEncoded, email, fullName }
}
```


## Handle a Sub-Field

In this example, we put `joinMonster` at the top-level. It's the first field after the `QueryRoot` and it handles batching the data for *all* of its children. It is not required that join monster be used at the top-level resolver. It can be invoked at lower fields in the schema tree, and be only responsible for that field and its descendants. Its use is exactly the same.

