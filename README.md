![join-monster](./join_monster.png)

# Join Monster

### Solving the round-trip problem between the API and the SQL Database

GraphQL is an API query language created by Facebook to solve the round-trip problem often encountered with REST APIs. Web and mobile clients are now able to get all the data it needs - and nothing more - all within a single request-response cycle. Additionally, many of the early adopters have used it in conjunction with the power of SQL databases. However, the round-trip issue still remains between the server and the database. Resolving the fields of a GraphQL query can involve many subsequent SQL queries, often with joins, resulting in many trips to the database.

This created a performance bottleneck on our production server, which we initially addressed by writing a single SQL query with multiple joins at the top-level resolver. All the child resolvers simply looked up properties from this conglomerate result. This resulted in more data being sent over TCP/IP than was requested by the client. Furthermore, an update to this query in the API server was required any time the client needed additional fields. We wanted to be able to get all the data necessary - and no more - in a single database query. To achieve this, we created Join Monster.

#### Translate GraphQL to SQL based on your schema
```graphql
{
  users {
    id
    idEncoded
    full_name
    email
    following {
      id
      full_name
    }
    comments {
      body
      author {
        id
        full_name
      }
      post {
        id
        body
        author {
          id
          full_name
        }
      }
    }
  }
}
```

becomes...

```sql
SELECT
  users.id AS id,
  users.first_name AS first_name,
  users.last_name AS last_name,
  users.email_address AS email_address,
  following.id AS following__id,
  following.first_name AS following__first_name,
  following.last_name AS following__last_name,
  comments.body AS comments__body,
  author.id AS comments__author__id,
  author.first_name AS comments__author__first_name,
  author.last_name AS comments__author__last_name,
  post.id AS comments__post__id,
  post.body AS comments__post__body,
  author_.id AS comments__post__author___id,
  author_.first_name AS comments__post__author___first_name,
  author_.last_name AS comments__post__author___last_name
FROM accounts AS users
LEFT JOIN relationships AS relationships ON users.id = relationships.follower_id
LEFT JOIN accounts AS following ON relationships.followee_id = following.id
LEFT JOIN comments AS comments ON users.id = comments.author_id
LEFT JOIN accounts AS author ON comments.author_id = author.id
LEFT JOIN posts AS post ON comments.post_id = post.id
LEFT JOIN accounts AS author_ ON post.author_id = author_.id
```

Join Monster is a query execution layer for GraphQL that automatically generates SQL by reading the query AST. By adding a minimal amount of metadata to your GraphQL schema, Join Monster can analyze it along with the GraphQL query and "compile" the SQL to fetch the data from the database. In doing to we have improved both the efficiency and the maintainability of our API. Not only is the SQL fetching all the data in a single query, it no longer has to be manually translated from the GraphQL. The SQL can adapt to schema changes since it is derived dynamically.
