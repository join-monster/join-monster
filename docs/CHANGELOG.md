### v1.2.0 (Mar. 16, 2017)
- Add an API for GraphQLInterfaceType

### v1.1.1 (Mar. 13, 2017)
- Add an API for GraphQLUnionType

### v1.1.0 (Mar. 11, 2017)
- Add Oracle as supported dialect.

### v1.0.1 (Mar. 8, 2017)
- Add `ORDER BY` support for non-paginated fields.

### v1.0.0 (Feb. 28, 2017)
- Batching capabilities added.
- MariaDB can do pagination on batches.
- `sqlExpr` can now be asynchronous.
- Remove unecessary "AS" from table alias in generated SQL.

**Breaking changes:**

- `getSQL` method removed. No longer makes sense in he new multiple-query paradigm.
- Offset pagination adds the `total` to the connection object instead of the `pageInfo`.

**Deprecated:**

- `joinTable` is deprecated. It was renamed to `junctionTable` to avoid over-use of the word "join".
- `'standard'` dialect is deprecated because nothing really implements the standard. The new default is `'sqlite3'`.



### v0.9.10 (Feb. 16, 2017)
- Bug fixes with recursive fragments and argument parsing.

### v0.9.9 (Feb. 3, 2017)
- Add `context` to the `sqlJoin` parameters.
- Support async in `sqlJoin`.

### v0.9.8 (Feb. 2, 2017)
- Expose parent table aliases to `where` function.

### v0.9.5 (Jan. 24, 2017)
- Fix bug for Postgres where `CONCAT` returns `''` instead of `NULL`.

### v0.9.4 (Jan. 22, 2017)
- Expose GraphQL args to `sqlJoin` function.

### v0.9.3 (Jan. 14, 2017)
- Add support for fragments on interface types.

### v0.9.2 (Jan. 5, 2017)
- Fix bug when composite keys contain timestamps or dates in PG dialect.
- Patch SQL injection risk.

### v0.9.0 (Jan. 4, 2017)
- More automatic fetching using `getNode` implemented.

### v0.8.0 (Dec. 19, 2016)
- Expose the `getSQL` method for getting only the converted SQL.

### v0.7.0 (Dec. 16, 2016)
- Introducing raw SQL expressions for computed columns.

### v0.6.0 (Dec. 2, 2016)
- Support asynchronicity in the `where` function.

### v0.5.8 (Dec. 1, 2016)
- Add null check to node interface handler.

### v0.5.7 (Nov. 29, 2016)
- Fix bug with `WHERE` conditions on paginated fields.

### v0.5.6 (Nov. 14, 2016)
- Fix bug with query variables on the Node interface.

### v0.5.5 (Nov. 13, 2016)
- Add support for dynamic sort keys on paginated fields. Sort keys can now be functions that receive the GraphQL arguments.

### v0.5.4 (Nov. 10, 2016)
- Add support for query variables.

### v0.5.2 (Nov. 6, 2016)
- Relay connection type names are no longer required to end with "Connection".

### v0.5.1 (Nov. 5, 2016)
- Fix problem with introspection queries.

### v0.5.0 (Nov. 4, 2016)
- Add dialect for MySQL/MariaDB.

### v0.4.1 (Oct 21, 2016)
- Fix bug with de-duplication of objects.

### v0.4.0 (Oct 20, 2016)
- Add Postgres dialect option.
- Support SQL pagination based on integer offsets.
- Support SQL pagination based on a sort key(s).

### v0.3.7 (Oct 16, 2016)
- Fix bug with nested fragments.

### v0.3.6 (Oct 13, 2016)
- Option to minify the raw data column names.

### v0.3.5 (Oct 9, 2016)
- Add test coverage tools.

### v0.3.4 (Oct 6, 2016)
- Add helper method for getting data for Relay's Node type.
- Fix bug with Union and Interface types.

### v0.3.2 (Oct 5, 2016)
- Add support for specifying schema names for your SQL tables.

### v0.3.1 (Oct 4, 2016)
- Detect Relay connection type and fetch data for it.

### v0.3.0 (Oct 3, 2016)
- Unique keys required for every table. Necessary for achieving good performance during object shaping/nesting.
- Composite keys supported for the unique key.
