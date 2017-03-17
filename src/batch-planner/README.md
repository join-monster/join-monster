# Batch Planner

Once this is called, the first batch has already been fetched and shaped. the SQL AST has already been crawled once. But it would have stopped when it sees the end of the batch. So in the example, it would already have the users and posts. It would not have the comments.

```javascript
{ args: { id: 2 },
  type: 'table',
  name: 'accounts',
  as: 'user',
  children:
   [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
     { type: 'column',
       name: 'email_address',
       fieldName: 'email',
       as: 'email_address' },
     { type: 'columnDeps',
       names: { first_name: 'first_name', last_name: 'last_name' } } ],
     { type: 'noop' },
     { type: 'table',
       name: 'posts',
       as: 'posts',
       orderBy: { body: 'desc' },
       children:
        [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
          { type: 'column', name: 'body', fieldName: 'body', as: 'body' },

          // the recursion breaks here
          { type: 'table',
            name: 'comments',
            as: 'comments',
            orderBy: { id: 'desc' },
            children:
             [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
               { type: 'column', name: 'body', fieldName: 'body', as: 'body' },
               { type: 'columnDeps', names: {} } ],
            fieldName: 'comments',
            grabMany: true,
            where: [Function: where],
            sqlBatch:
             { thisKey:
                { type: 'column',
                  name: 'post_id',
                  fieldName: 'post_id',
                  as: 'post_id' },
               parentKey: { type: 'column', name: 'id', fieldName: 'id', as: 'id' } } },
          { type: 'columnDeps', names: {} } ],
       fieldName: 'posts',
       grabMany: true,
       where: [Function: where],
       sqlJoin: [Function: sqlJoin] },
  fieldName: 'user',
  grabMany: false,
  where: [Function: where] }
```

The batch planner will recursively scan the rest of the SQL AST to fetch and shape the remaining batches. In this case it will grab the comments and mtach them with their respective posts.

