## Through a Junction Table

Let us allow `Users` to follow one another. We'll need to go through a junction table for the many-to-many and hence two joins to fetch this field. For this we can specify a `junction` object, which has ([thunked](/API/#thunk)) `sqlTable` which is the name of the intermediate join table, and also `sqlJoins`, an array of two functions that generate the `JOIN` conditions. The first joins the parent table to the junction, and the second joins the junction to the child table.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    following: {
      description: 'Users that this user is following',
      type: new GraphQLList(User),
      junction: {
        // name the table that holds the two foreign keys
        sqlTable: 'relationships',
        sqlJoins: [
          // first the parent table to the junction
          (followerTable, junctionTable, args) => `${followerTable}.id = ${junctionTable}.follower_id`,
          // then the junction to the child
          (junctionTable, followeeTable, args) => `${junctionTable}.followee_id = ${followeeTable}.id`
        ]
      }
    }
  })
})
```

Now we have a self-referential, many-to-many relationship.

```grapql
{
  users { 
    id
    email
    fullName
    following {
      id
      fullName
    }
  }
}
```

We also want to support the likes table. We'll allow the `Comment` type to see which users liked it.

```javascript
const Comment = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    likers: {
      description: 'Which users have liked this comment',
      type: new GraphQLList(User),
      junction: {
        sqlTable: 'likes',
        sqlJoins: [
          (commentTable, likesTable) => `${commentTable}.id = ${likesTable}.comment_id`,
          (likesTable, userTable) => `${likesTable}.account_id = ${userTable}.id`
        ]
      }
    }
  })
})
```

## Applying `WHERE` conditions

In a similar manner, `where` can be added to this field, and it will apply to the `accounts` table for the followees. You can also add a `where` in the `junction` object to apply a `WHERE` clause on the junction table.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    following: {
      type: new GraphQLList(User),
      // only get followees who's account is still active
      where: accountTable => `${accountTable}.is_active = TRUE`,
      junction: {
        sqlTable: 'relationships',
        // filter out where they are following themselves
        where: junctionTable => `${junctionTable}.follower_id <> ${junctionTable}.followee_id`
        sqlJoins: [
          (followerTable, junctionTable, args) => `${followerTable}.id = ${junctionTable}.follower_id`,
          (junctionTable, followeeTable, args) => `${junctionTable}.followee_id = ${followeeTable}.id`
        ]
      }
    }
  })
})
```

## Including Data From the Junction

Sometimes you actually want to expose some data columns from your junction tables.
Suppose the `relationships` table had a `closeness` column representing varying degrees of intimacy for each relationship.
To expose this, there are two options.
The first is to create a `GraphQLObjectType` for the `relationships` table.
This table could become an interleaving `Relationship` type instead of using Join Monster's `junction` option.

```graphql
{
  user(id: 2) {
    name
    email
    relationships {
      closeness
      user {
        id
        name
      }
    }
  }
}
```

If you don't want that extra object type between your users and followees, you can use the `junction.include` property.

```js
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    // add the closeness to the User instead
    closeness: {
      type: GraphQLString
    },
    following: {
      type: new GraphQLList(User),
      junction: {
        sqlTable: 'relationships',
        include: {
          closeness: {
            sqlColumn: 'closeness'
          }
        },
        sqlJoins: [
          (followerTable, junctionTable, args) => `${followerTable}.id = ${junctionTable}.follower_id`,
          (junctionTable, followeeTable, args) => `${junctionTable}.followee_id = ${followeeTable}.id`
        ]
      }
    }
  })
})
```

The `include` property is an object that maps field names from the child object type to dependecies on column in the junction table.
It supports `sqlColumn`, `sqlDeps`, and `sqlExpr`.
In this case, `closeness` is a child on the `User` of the `following` field.
When `closeness` is requested in the query, the `closeness` column will be fetched from the junction via the `sqlColumn` option.

So now the query would look something like this:

```graphql
{
  user(id: 2) {
    name
    email
    following {
      id
      closeness
      name
    }
  }
}
```

We've completed the schema diagram! We can theoretically resolve any GraphQL query with one SQL query! In the next section we'll see how we can batch the request different to reduce the number of joins.

