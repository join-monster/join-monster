## Closing the Loop

Let's go deeper and join the post on the comment, a one-to-one relationship. We'll define the `Post`, give it the SQL metadata, and add it as a field on the `Comment`. Each of these also has an author, which maps to the `User` type, let's tell `joinMonster` how to fetch those too.

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
      sqlJoin: (postTable, userTable) => `${postTable}.author_id = ${userTable}.id`
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
      sqlJoin: (commentTable, postTable) => `${commentTable}.post_id = ${postTable}.id`
    },
    author: {
      description: 'The user who wrote the comment',
      type: User,
      sqlJoin: (commentTable, userTable) => `${commentTable}.author_id = ${userTable}.id`
    }
  })
})
```

Now you have some depth and back references. It would be possible to cycle.

```graphql
{
  users { 
    id, idEncoded, email, fullName
    comments {
      id, body
      author { fullName }
      post {
        id, body
        author { fullName }
      }
    }
  }
}
```

