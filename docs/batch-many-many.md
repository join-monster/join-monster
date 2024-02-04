## More Batching

Batching can also be done through a many-to-many relationship.
After the first SQL query, Join Monster will select from the junction table, and then join it on the related table.
The `junction` object will need a couple more properties, including a `uniqueKey` for itself, and `sqlBatch`.
This can be string for a single unique column or an array for a composite.

```javascript
const User = new GraphQLObjectType({
  // ...
  fields: () => ({
    following: {
      description: 'Users that this user is following',
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          // batching many-to-many is supported too
          junction: {
            sqlTable: 'relationships',
            // this table has no primary key, but the combination of these two columns is unique
            uniqueKey: ['follower_id', 'followee_id'],
            sqlBatch: {
              // the matching column in the junction table
              thisKey: 'follower_id',
              // the column to match in the user table
              parentKey: 'id',
              // how to join the related table to the junction table
              sqlJoin: (junctionTable, followeeTable) =>
                `${junctionTable}.followee_id = ${followeeTable}.id`
            }
          }
        }
      }
    }
  })
})
```

This introduces another batch to the plan.
In addition to the changes made on the previous page, the plan now has 3 database queries.

![query-plan-3](img/query-plan-3.png)

Requests for the followees and for the comments are independent, and are sent concurrently.
