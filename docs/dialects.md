## Supported Dialects

SQL is not copy-paste portable.
Each database vendor implements SQL differently.
You can use `joinMonster`'s options argument to pick your dialect (see [details](/API/#joinMonster)).
Here is a list of the currently supported SQL dialects. 

| Dialect | Pagination | Description |
| ------- | ---------- | ----------- |
|`'sqlite3'`| Application-layer only | Supports the most basic features. Because it's so simple, some other vendors will still work. Postgres and Oracle can, albeit without the pagination features. |
|`'mariadb'`| Offset and keyset with batching only | A more capable superset of MySQL. Version >= 10.2 is required since window functions are used for pagination. If using a prior version, use the MySQL dialect. |
|`'mysql'`| Application-layer only | Basically the same as SQLite3 but with backticks.
|`"pg"`| All types supported | The most powerful dialect. Version >= 9.3 required since lateral joins are used for pagination.

Adding other dialects is welcomed and encouraged.
Microsoft SQL Server, for example, uses `OUTER APPLY` instead of `JOIN LATERAL`.
Oracle 12c added `OFFSET` and inline `LATERAL` joins.
These should be an easy conversion.
Have a look at the `/src/stringifiers` directory.

