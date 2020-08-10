## The Where Function

We of course don't want every single user in the database.
We need a way to place a `WHERE` clause in the query.

You can define a `where` function on a field that generates the `WHERE` condition.
Its parameters are the table alias (generated automatically by `joinMonster`), the GraphQL arguments on that field, the "context" mentioned earlier, and the field's "SQL AST node".
The (Promise of) string returned is the `WHERE` condition.
If a falsy value is returned, there will be no `WHERE` condition.
We'll add another top-level field that just returns one user.

```javascript
const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: { /*...*/ },
    user: {
      type: User,
      // allow them to search for a specific  user
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) }
      },
      extensions: {
        joinMonster: {
          where: (usersTable, args, context) => {
            return `${usersTable}.id = ${args.id}`
          }
        }
      },
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, {}, sql => {
          return knex.raw(sql)
        })
      }
    }
  })
})
```

Now you can handle queries like this, which return a single user.

```graphql
{
  user(id: 1) {
    id
    email
    fullName
  }
}
```

This `where` function directly interpolates user input into its clause.
This if fine for integers, as the GraphQL validation will prevent malicious input.
However, for strings, this is not recommended in production due to SQL injection risk.
Instead, you should **escape the input** yourself or use an established library like [sqlstring](https://github.com/mysqljs/sqlstring), [pg-format](https://github.com/datalanche/node-pg-format), or [pg-escape](https://github.com/segmentio/pg-escape).

```javascript
import escape from 'pg-escape'

const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    user: {
      type: User,
      args: {
        lastName: GraphQLString
      },
      extensions: {
        joinMonster: {
          where: (usersTable, args, context) => {
            return escape(`${usersTable}.last_name = %L`, args.lastName)
          }
        }
      }
      // ...
    }
  })
})
```

## Adding Context

Most often, we'll be asking for the *logged-in* user.
The `joinMonster` function has a third parameter which is basically an arbitrary object with useful contextual information that your `where` functions might depend on.
For example, you can pass in the ID of the logged in user to incorporate it into the `WHERE` condition.

```javascript
{
  //...
  // there is a GraphQL context and a Join Monster context. these are separate!
  resolve: (parent, args, context, resolveInfo) => {
    // get some info off the HTTP request, like the cookie.
    const loggedInUserId = getHeaderAndParseCookie(context)
    return joinMonster(resolveInfo, { id: loggedInUserId }, sql => {
      return knex.raw(sql)
    })
  },
  extensions: {
    joinMonster: {
      where: (usersTable, args, context) => {
        return `${usersTable}.id = ${context.id}`
      }
    }
  }
}
```

Again, don't forget to double-quote case sensitive column names.

See [API](/API/#where) for more details on this callback.

