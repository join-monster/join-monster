## Overview
[Join Monster](https://github.com/stems/join-monster) fetches only the data you need - *nothing more, nothing less*, just like to original philosophy of GraphQL. It reads the parsed GraphQL query, looks at your schema definition, and generates the SQL automatically that will fetch no more than what is required to fulfill the request. All data fetching for all resources becomes a single batch request. No need to manually write a bunch of SQL queries to fetch the right amount of data for all the various types of GraphQL queries.

## Modeling Your Data

There are a few constraints in order for SQL's relational model to make sense with GraphQL's hierarchical one. 

![data-model](img/object-map.png)

SQL tables must be mapped to a `GraphQLObjectType`. Field on this `GraphQLObjectType` correspond to a SQL column in either a one-to-one, or one-to-many correspondence (e.g. a `fullName` field may need a `last_name` and a `first_name` column in the table). Not all fields have to have a corresponding SQL column. Some can still resolve data from other sources.

Each instance of the object type is one row from it's mapped table. Fields which are a `GraphQLList` of your table's object type represent any number of rows from that table. If you schema includes any such lists, your table must also have a unique key.

If one table's object type is nested as a field within another table's object type in the GraphQL schema, the data must be fetched as a `JOIN`.

![join](img/join-map.png)

## Adding Metadata

So [Join Monster](https://github.com/stems/join-monster) needs some additional metadata in order to write the right SQL. How does one declare these mappings, and unique keys, and joins, etc.?

These are declared by decorating the schema definition with some additional properties that [Join Monster](https://github.com/stems/join-monster) will look for. Below is an example of  mapping the `User` object to an `accounts` table that joins on `posts` for a `Post` object. For details see the following **Usage** section.

```javascript
const User = new GraphQLObjectType({
  name: 'User',
  sqlTable: 'accounts',
  uniqueKey: 'id',
  fields: () => ({
    id: {
      type: GraphQLInt,
      sqlColumn: 'id'
    },
    email: {
      type: GraphQLString,
      sqlColumn: 'email_address'
    },
    immortal: {
      type: graphQLInt,
      resolve: () => false
    },
    posts: {
      type: new GraphQLList(Post),
      sqlJoin: (userTable, postTable) => `${userTable}.id = ${postTable}.author_id`
    }
  })
})
```

Join Monster provides a declarative API that lets you define **data requirements** on your object types and fields. By placing these properties directly on the schema definition, GraphQL effectively *becomes* your ORM because it is the mapping between the application and the data.

Notice that most of these fields do not have resolvers. Most of the time, adding the SQL decorations will be enough. [Join Monster](https://github.com/stems/join-monster) fetches the data and converts it to the correct object tree structure with property names the same as their respoctive fields so that the default resolving behavior will find the data.

Also notice the `immortal` field, which does have a resolver. This field demonstrates how not all the fields must come from the batch request. You can write custom resolvers like you normally would that gets data from anywhere else. [Join Monster](https://github.com/stems/join-monster) is just a way of fetching data, it will not hinder your ability to write your resolvers. You can also have your fields get data fron a column *and* apply a resolver to modify, format, or extend the data.


## Internal Workings

One does not need to know this in order to use [Join Monster](https://github.com/stems/join-monster). It's a convenient visualization for those who want to dive into the code.

![internals](img/internals.png)

It starts with the parsed AST of the client's GraphQL query. Join Monster gets the fields being requested and finds the corresponding field in the schema definition. From there it grabs that extra metadata needed to generate the SQL. After traversing the whole query AST, an intermediate representation is generated: a hybrid of the GraphQL query and the SQL metadata. We call it the **SQL AST**. This is then compiled to the SQL itself. The SQL AST is also converted to another structure that specifies the **Shape Definition**.

The SQL is then passed to the user-defined function for talking to the database. This function must then return the "raw data", a flat array of all the rows. The Shape Definition is used to nest the data and deduplicate any entities within the rows. The rest of the execution phase proceeds with these new data. The properties on this data tree will have the same names as their respective fields, so children of the resolver that called `joinMonster` know where to find the data.
