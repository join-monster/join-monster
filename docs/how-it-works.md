## Overview
Join Monster fetches only the data you need - *nothing more, nothing less*, just like to original philosophy of GraphQL. It reads the parsed GraphQL query, looks at your schema definition, and generates the SQL automatically that will fetch no more than what is required to fulfill the request. All data fetching for all resources becomes a single batch request. No need to manually write a bunch of SQL queries to fetch the right amount of data for all the various types of GraphQL queries.

## Modeling Your Data

There are a few constraints in order for SQL's relational model to make sense with GraphQL's hierarchical one. 

![data-model](img/object-map.png)

SQL tables must be mapped to a `GraphQLObjectType`. Field on this `GraphQLObjectType` correspond to a SQL column in either a one-to-one, or one-to-many correspondence (e.g. a `fullName` field may need a `last_name` and a `first_name` column in the table). Not all fields have to have a corresponding SQL column. Some can still resolve data from other sources.

Each instance of the object type is one row from it's mapped table. Fields which are a `GraphQLList` of your table's object type represent any number of rows from that table. If you schema includes any such lists, your table must also have a unique key.

If one table's object type is nested as a field within another table's object type in the GraphQL schema, the data must be fetched as a `JOIN`.

