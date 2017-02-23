## Using the Function

We haven't actually seen the module get used yet...

Import `joinMonster`. Have the top-most field that maps to a SQL table implement a resolver function that calls `joinMonster`.
Simply pass it the **resolve info** (this is the 4th parameter of the resolver, which includes the parsed query and your schema definition),
a [context](/where/#adding-context) object (which can be empty for now),
and a callback that takes the SQL as a parameter, calls the database, and returns a `Promise` of the data.

```javascript
import joinMonster from 'join-monster'

const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: {
      type: new GraphQLList(User),
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, {}, sql => {
          // knex is a SQL query library for NodeJS. This method returns a `Promise` of the data
          return knex.raw(sql)
        })
      }
    }
  })
})
```

There are a few options to pass as the fourth parameter, like which SQL dialect to use. See [API](/API/#joinMonster) for details on this function.

The data *MUST* be an array of objects where each object represents a row in the result set. For example:
```javascript
[
  { id: 1, email_address: 'andrew@stem.is', post__id: 13, post__body: 'Hello world.' },
  { id: 2, email_address: 'matt@stem.is', post__id: 15, post__body: 'Make it less side-effecty!' }
]
```

<div class="admonition danger">
  <p class="first admonition-title">Warning</p>
  <p class="last">
    If you are using Knex, be careful. The <code>raw</code> method will return different objects depending on the knex dialect being used. The exact snippet above may not work with MySQL, MariaDB, etc.
  </p>
</div>


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

In this example, we put `joinMonster` at the top-level.
It's the first field after the `QueryRoot` and it handles batching the data for *all* of its children that are mapped to a SQL table.
It is not required that join monster be used at the top-level resolver.
It can be invoked at lower fields in the schema tree, and be only responsible for that field and its descendants.
Its use is exactly the same.

