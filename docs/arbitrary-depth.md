## Deeper Relations

We can get even more data in one database query. Let's go deeper and join the post on the comment, a one-to-one relationship. We'll define the `Post`, give it the SQL metadata, and add it as a field on the `Comment`. Each of these also has an author, which maps to the `User` type, let's tell `joinMonster` how to fetch those too.

```javascript
const Post = new GraphQLObjectType({
  name: 'Post',
  sqlTable: 'posts',
  uniqueKey: 'id',
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    body: {
      description: 'The content of the post',
      type: GraphQLString
    },
    // we'll give the `Post` a field which is a reference to its author, back to the `User` type too
    author: {
      description: 'The user that created the post',
      type: User,
      extensions: {
        joinMonster: {
          sqlJoin: (postTable, userTable, args, context) =>
            `${postTable}.author_id = ${userTable}.id`
        }
      }
    }
  })
})

const Comment = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    post: {
      description: 'The post that the comment belongs to',
      type: Post,
      extensions: {
        joinMonster: {
          sqlJoin: (commentTable, postTable) =>
            `${commentTable}.post_id = ${postTable}.id`
        }
      }
    },
    author: {
      description: 'The user who wrote the comment',
      type: User,
      extensions: {
        joinMonster: {
          sqlJoin: (commentTable, userTable) =>
            `${commentTable}.author_id = ${userTable}.id`
        }
      }
    }
  })
})
```

Now you can get the comments the user has written, the post on which each comment was created, and the author of that post. We have some depth and back references. It would be possible to cycle.

```graphql
{
  users {
    id
    email
    fullName
    comments {
      id
      body
      author {
        fullName
      }
      post {
        id
        body
        author {
          fullName
        }
      }
    }
  }
}
```

## Closing the Loop

We also want the users to access the posts they have written. So we'll add that field to the `User`.

```javascript
const User = new GraphQLObjectType({
  //...
  fields: () => ({
    //...
    posts: {
      type: new GraphQLList(Post),
      extensions: {
        joinMonster: {
          sqlJoin: (userTable, postTable, args) =>
            `${userTable}.id = ${postTable}.author_id`
        }
      }
    },
    comments: {
      type: new GraphQLList(Comment),
      extensions: {
        joinMonster: {
          sqlJoin: (userTable, commentTable, args) =>
            `${userTable}.id = ${commentTable}.author_id`
        }
      }
    }
  })
})
```

Finally, we can get a `Post` from its `Comment`. Let's allow the inverse: to see all comments on a `Post`.

```javascript
const Post = new GraphQLObjectType({
  // ...
  fields: () => ({
    // ...
    comments: {
      description: 'The comments on this post',
      type: new GraphQLList(Comment),
      extensions: {
        joinMonster: {
          // the JOIN condition also checks that the comment is not archived
          sqlJoin: (postTable, commentTable) =>
            `${postTable}.id = ${commentTable}.post_id AND ${commentTable}.archived = FALSE`
        }
      }
    }
  })
})
```

Again, the data is all fetched in a single query thanks to `JOIN`s.
However, doing all these joins can be cumbersome on the database.
We can split it into two, or perhaps more, separate queries to reduce the number of joins in the next section.
