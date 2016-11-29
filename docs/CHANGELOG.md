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
