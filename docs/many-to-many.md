## Through a Join Table

Let us allow `Users` to follow one another. We'll need to go through a join table for the many-to-many and hence two joins to fetch this field. For this we can specify `joinTable`, which is the name of the intermediate join table. We also need `sqlJoins`, an array of two functions that generate the `JOIN` conditions, the first joins the parent table to the intermediate, and the second joins the intermediate to the child table.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    following: {
      description: 'Users that this user is following',
      type: new GraphQLList(User),
      joinTable: 'relationships', // this is the name of our join table
      sqlJoins: [
        // first the parent table to the join table
        (followerTable, relationTable, args) => `${followerTable}.id = ${relationTable}.follower_id`,
        // then the join table to the child
        (relationTable, followeeTable, args) => `${relationTable}.followee_id = ${followeeTable}.id`
      ]
    },
  })
})
```

Now we have a self-referential, many-to-many relationship.

```grapql
{
  users { 
    id, idEncoded, email, fullName
    following { fullName }
  }
}
```

