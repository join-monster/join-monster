## Adding Sorting

To add any of the tables to the `ORDER BY` clause, you can add the ([thunked](/API/#thunk)) `orderBy` property. This is an object of with the sorted column(s) as  the key(s) and either `'ASC'` or `'DESC'` as the value(s).


```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    comments: {
      type: new GraphQLList(Comment),
      // order these alphabetically, then by "id" if the comment body is the same
      orderBy: {
        body: 'asc',
        id: 'desc'
      },
      sqlJoin: (userTable, commentTable, args) => `${userTable}.id = ${commentTable}.author_id`
    }
  })
})

const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: {
      type: new GraphQLList(User),
      orderBy: {
        id: 'asc'
      },
      resolve: (parent, args, context, resolveInfo) => {
        // joinMonster
      }
    }
  })
})
```

So when we ask for a list of users and their comments:

```graphql
{
  users {
    email
    comments {
      id
      body
    }
  }
}
```

The SQL would look something like this:

```sql
SELECT
  "users"."id" AS "id",
  "users"."email_address" AS "email_address",
  "comments"."id" AS "comments__id",
  "comments"."body" AS "comments__body"
FROM accounts "users"
LEFT JOIN comments "comments" ON "comments".author_id = "users".id 
ORDER BY "users"."id" ASC, "comments"."body" ASC, "comments"."id" DESC
```

## Sort Dynamically

You may want to provide the consumer multiple sorting options. Rather than an object, you can make `orderBy` a function that returns the object. This function will take the GraphQL args as a parameter.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    comments: {
      type: new GraphQLList(Comment),
      // the user can use this argument to determine sort column
      args: {
        by: { type: ColumnEnum }
      },
      orderBy: args => {
        const sortBy = args.by || 'id'
        return {
          [sortBy]: 'desc'
        }
      },
      sqlJoin: (userTable, commentTable, args) => `${userTable}.id = ${commentTable}.author_id`
    }
  })
})
```

For many-to-many relations, you can add `orderBy` to the field directly, and/or within the `junction` object to order by columns on the junction table.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    following: {
      type: new GraphQLList(User),
      // order by the user id
      orderBy: { id: 'DESC' },
      junction: {
        sqlTable: 'relationships',
        // this would have been equivalent
        //orderBy: { followee_id: 'DESC' },
        sqlJoins: [
          (followerTable, junctionTable, args) => `${followerTable}.id = ${junctionTable}.follower_id`,
          (junctionTable, followeeTable, args) => `${junctionTable}.followee_id = ${followeeTable}.id`
        ]
      }
    }
  })
})
```

