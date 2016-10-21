## Architecture

One does not need to know this in order to use [Join Monster](https://github.com/stems/join-monster). It's a convenient visualization for those who want to dive into the code.

![internals](img/internals.png)

This whole process begins when you call `joinMonster` and pass it the `resolveInfo`. Join Monster looks at two key things: the parsed query AST and your schema definition. Join Monster gets the fields being requested and finds the corresponding field in the schema definition. From there it grabs that extra metadata needed to generate the SQL. After traversing the whole query AST, an intermediate representation is generated: a hybrid of the GraphQL query and the SQL metadata. We call it the **SQL AST**.

This example query:

```graphql
{
  user(id: 2) {
    id
    fullName
    email
    posts {
      id
      body
    }
  }
}
```

Becomes this SQL AST:

```javascript
{ type: 'table',
  name: 'accounts',
  as: 'user',
  args: { id: 2 },
  fieldName: 'user',
  grabMany: false,
  where: [Function: where],
  children:
   [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
     { type: 'column',
       name: 'email_address',
       fieldName: 'email',
       as: 'email_address' },
     { type: 'table',
       name: 'posts',
       as: 'posts',
       fieldName: 'posts',
       grabMany: true,
       sqlJoin: [Function: sqlJoin],
       children:
        [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
          { type: 'column', name: 'body', fieldName: 'body', as: 'body' },
          { type: 'columnDeps', names: {} } ] },
     { type: 'columnDeps',
       names: { first_name: 'first_name', last_name: 'last_name' } } ] }
```

This is then compiled to the SQL itself.

```sql
SELECT
  "user"."id" AS "id",
  "user"."email_address" AS "email_address",
  "posts"."id" AS "posts__id",
  "posts"."body" AS "posts__body",
  "user"."first_name" AS "first_name",
  "user"."last_name" AS "last_name"
FROM accounts AS "user"
LEFT JOIN posts AS "posts" ON "user".id = "posts".author_id
WHERE "user".id = 2
```

The SQL AST is also converted to another structure that specifies the **Shape Definition**, which is used for the nesting/shaping process.

```javascript
{ id: 'id',
  email: 'email_address',
  posts: [ { id: 'posts__id', body: 'posts__body' } ],
  first_name: 'first_name',
  last_name: 'last_name' }
```

The SQL is then passed to the user-defined function for talking to the database. This function must then return the "raw data", a flat array of all the rows.

```javascript
[ { id: 2,
    email_address: 'Rachel57@hotmail.com',
    posts__id: 8,
    posts__body: 'Optio autem aliquid doloremque consequuntur quia ad doloribus. Odio dolores et tenetur nihil accusantium saepe quas aliquid ea. Sint est earum debitis quo dolor aperiam. Omnis reiciendis quod omnis saepe est sit necessitatibus.',
    first_name: 'Collin',
    last_name: 'Blanda' },
  {
    id: 2,
    email_address: 'Rachel57@hotmail.com',
    posts__id: 20,
    posts__body: 'Mollitia officia facilis autem. Repellendus placeat assumenda veritatis provident ut praesentium sunt. Fugit atque quia iure doloremque odit voluptas praesentium nobis excepturi. Quam quidem maxime impedit sed doloribus qui qui sint.',
    first_name: 'Collin',
    last_name: 'Blanda' },
  { ... },
  { ... },
  { ... } ]
```

The Shape Definition is used to nest the data and deduplicate any entities within the rows. The rest of the execution phase proceeds with these new data. The properties on this data tree will have the same names as their respective fields, so children of the resolver that called `joinMonster` know where to find the data.

```javascript
{
  "data": {
    "user": {
      "id": 2,
      "fullName": "Collin Blanda",
      "email": "Rachel57@hotmail.com",
      "posts": [
        {
          "id": 8,
          "body": "Optio autem aliquid doloremque consequuntur quia ad doloribus. Odio dolores et tenetur nihil accusantium saepe quas aliquid ea. Sint est earum debitis quo dolor aperiam. Omnis reiciendis quod omnis saepe est sit necessitatibus."
        },
        {
          "id": 20,
          "body": "Mollitia officia facilis autem. Repellendus placeat assumenda veritatis provident ut praesentium sunt. Fugit atque quia iure doloremque odit voluptas praesentium nobis excepturi. Quam quidem maxime impedit sed doloribus qui qui sint."
        },
        { ... },
        { ... },
        { ... }
      ]
    }
  }
}
```

