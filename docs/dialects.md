
## Supported Dialects
SQL is not copy-paste portable.
Each database vendor implements SQL differently.
You can use `joinMonster`'s options argument to pick your dialect (see [details](/API/#joinMonster)).
Here is a list of the currently supported SQL dialects. 

| Dialect | Pagination | Description |
| ------- | ---------- | ----------- |
|`'sqlite3'`| Application-layer only | Supports the most basic features. Because it's so simple, some other vendors will still work. Postgres and Oracle can, albeit without the pagination features. |
|`'mysql'`| Application-layer only | Basically the same as SQLite3 but with backticks. If using version >= 8.0, the `'mysql8'` dialect is recommended instead. |
|`'mysql8'`| Offset and keyset with batching only | A more capable superset of MySQL. Version >= 8.0 is required since window functions are used for pagination. If using a prior version, use the MySQL dialect. |
|`'mariadb'`| Offset and keyset with batching only | A more capable superset of MySQL. Version >= 10.2 is required since window functions are used for pagination. If using a prior version, use the MySQL dialect. |
|`'pg'`| All types supported | Fully-featured dialect. Version >= 9.3 required since `LATERAL JOIN`s are used for pagination. |
|`'oracle'`| All types supported | Fully-featured dialect. Version >= 12 required since `CROSS` and `OUTER APPLY` are used for pagination. If you are using 12.1, you may encounter [this regression bug](https://community.oracle.com/thread/3998288). You can address this by applying the appropriate patch or switch to version 12.2 or later.

Adding other dialects is welcomed and encouraged.
Have a look at the `/src/stringifiers` directory.

