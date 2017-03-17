# Generating the SQL AST


```javascript
{ args: { id: 2 }, // the GraphQL arguments on this field
  type: 'table',
  name: 'accounts', // the expression for the actual table
  as: 'user', // what to alias it as. it must be unique for each time the table is selected from within one query
  children:
   [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' }, // some columns have the same name as their fields
     { type: 'column', // others dont
       name: 'email_address',
       fieldName: 'email',
       as: 'email_address' },
     { type: 'columnDeps', // some resolvers just depend on some columns to compute the value
       names: { first_name: 'first_name', last_name: 'last_name' } } ],
     { type: 'noop' }, // favNums is a noop. it has its own resolver
     { type: 'table',
       name: 'posts', // another table. need to JOIN on this
       sqlJoin: [Function: sqlJoin],
       as: 'posts',
       orderBy: { body: 'desc' }, // it has an ORDER BY clause
       children:
        [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
          { type: 'column', name: 'body', fieldName: 'body', as: 'body' },
          { type: 'table',
            name: 'comments', // a table in a table in a table!
            as: 'comments',
            orderBy: { id: 'desc' },
            children:
             [ { type: 'column', name: 'id', fieldName: 'id', as: 'id' },
               { type: 'column', name: 'body', fieldName: 'body', as: 'body' },
               { type: 'columnDeps', names: {} } ],
            fieldName: 'comments',
            grabMany: true,
            where: [Function: where],
            sqlBatch: // instead of `sqlJoin`, this will be fetched in another batch
             { thisKey:
                { type: 'column',
                  name: 'post_id',
                  fieldName: 'post_id',
                  as: 'post_id' },
               parentKey: { type: 'column', name: 'id', fieldName: 'id', as: 'id' } } },
          { type: 'columnDeps', names: {} } ],
       fieldName: 'posts',
       grabMany: true }, // but the posts are a GraphQLList
  fieldName: 'user',
  grabMany: false, // user is singular
  where: [Function: where] }
```
