## The Where Function

We of course don't always want every row from every table. We need a way to place a `WHERE` clause in the query.

In a similar manner to the `sqlJoin` function, you can define a `where` function on a field. Its parameters are the table alias (generated automatically by `joinMonster`), the GraphQL arguments on that field, and the "context" mentioned earlier. The string returned is the `WHERE` condition. If a falsy value is returned, there will be no `WHERE` condition. We'll add another top-level field that just returns one user.

```javascript
const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: { /*...*/ },
    user: {
      type: User,
      args: {
        id: { type: GraphQLInt }
      },
      where: (usersTable, args, context) => {
        if (args.id) return `${usersTable}.id = ${args.id}`
      },
      resolve: (parent, args, context, ast) => {
        return joinMonster(ast, {}, sql => {
          return knex.raw(sql)
        })
      }
    }
  })
})
```

```graphql
{
  user(id: 1) { 
    id, idEncoded, email, fullName
    following { fullName }
    comments { id, body }
  }
}
```

## Adding Context

The `joinMonster` function has a second parameter which is basically an arbitrary object with useful contextual information that your `where` functions might depend on. For example, if you want to get the **logged in** user, the ID of the logged in user could be passed in the second argument.

```javascript
{
  //...
  // there is a GraphQL context and a Join Monster context. these are separate!
  resolve: (parent, args, context, ast) => {
    // get some info off the HTTP request, like the cookie.
    const loggedInUserId = getHeaderAndParseCookie(context)
    return joinMonster(ast, { id: loggedInUserId }, sql => {
      return knex.raw(sql)
    })
  },
  where: (usersTable, args, context) => {
    return `${usersTable}.id = ${context.id}`
  }
}
```

