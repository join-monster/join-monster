## Video Summary

<iframe width="560" height="315" src="https://www.youtube.com/embed/Y7AdMIuXOgs" frameborder="0" allowfullscreen></iframe>
<br>

## Round Trips

GraphQL is an elegant solution the round-trip problem often encountered with REST APIs. Rather than making several HTTP requests from the client to the API server, all the desired data can be batched in to a single request, reducing wait times due to network latency. However, we *still* have to make sure GraphQL executes quickly against our back-end.

![batch-request](img/batch-request.png)

Most applications fetch data from a database server over the TCP/IP stack. So how do we mitigate the number of round-trips to our **database**? Consider the following schema: `Users` that have many `Posts` that have many `Comments`.

![schema](img/schema.png)

Here is a sensible query to retrieve some info from these tables.
```graphql
{
  users {
    name
    posts {
      body
      comments { body, author_id }
    }
  }
}
```

How might we go about resolving this?

```javascript
const User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    name: { /*...*/ },
    posts: {
      type: new GraphQLList(Post),
      resolve: user => {
        return db.query(`SELECT * FROM posts WHERE author_id = '?'`, user.id)
      }
    }
  })
})

const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    body: { /*...*/ },
    comments: {
      type: new GraphQLList(Comment),
      resolve: post => {
        return db.query(`SELECT * FROM comments WHERE post_id = '?'`, post.id)
      }
    }
  })
})
```

Elegant as this is, consider what happens if the user has 20 posts. That's one SQL query for the posts, and **20 more** for each post's set of comments. This is a total of at least 21 round-trips to the database (we haven't considered how we got the `User` data)! This could easily become a performance bottleneck. We've encountered the round-trip problem again (on the back-end instead of the client). We need to optimize the data-fetching against our back-end!

## Over-Fetching

Of course, it doesn't have to be done this way. Perhaps we can reduce the round-trips by doing the joins all at once in the `User` resolver.

```javascript
const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: {
      type: new GraphQLList(User),
      resolve: async () => {
        const sql = `
          SELECT * from accounts
          JOIN posts ON posts.author_id = accounts.id
          JOIN comments ON comments.post_id = posts.id
        `
        const rows = await db.query(sql)
        // convert the flat rows to the object tree structure
        const tree = nestObjectShape(rows)
        return tree
      }
    }
  })
})
```
So we got all the data at the top level, this will simplify the `Posts` and `Comments` resolvers since those properties are already there.
```javascript
const User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    name: { /*...*/ },
    posts: {
      type: new GraphQLList(Post)
    }
  })
})

const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    body: { /*...*/ },
    comments: {
      type: new GraphQLList(Comment)
    }
  })
})
```
Although we made the round-trip problem go away, what if another query doesn't even ask for the comments?

```graphql
{
  users {
    name
    posts { body }
  }
}
```

During the execution of this request, it will wastefully join on the comments! Now we're over-fetching (and over-joining). The resolving phase essentially becomes a bunch of property lookups for a conglomerate result we prepared in the top-level. Our database might be able to handle it now, but this approach will not scale to more complex schema. Consider a schema like this:

![schema-complex](https://raw.githubusercontent.com/join-monster/join-monster/master/docs/img/schema-complex.png)

Imagine doing all those joins up front. This is especially wasteful when client only wants a couple of those resources. We now have the inverse problem: **getting too much data.** We've also reduced the maintainability of our code. Changes to the schema will require changes to the SQL query that fetches all the data. Furthermore, there is the extra burden of converting the database result into the right Object shape, since many database drivers simply return a flat, tabular structure.
