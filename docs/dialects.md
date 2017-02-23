## Supported Dialects

SQL is not copy-paste portable.
Each database vendor implements SQL differently.
You can use `joinMonster`'s options argument to pick your dialect (see [details](/API/#joinMonster)).
Here is a list of the currently supported SQL dialects.

1. `"standard"` - No particular dialect. Resorts to very basic features. Should work with SQLite and PostgreSQL, but not MySQL.
1. `"mysql"` - Specialized for MySQL and MariaDB.
1. `"pg"` - Specialized for PostgreSQL. Has more advanced pagination thanks to the `LATERAL` keyword. This requires version 9.3 or later. This should theoretically work with Oracle, but this is not yet tested.

Adding other dialects is welcome and encourage. Microsoft SQL Server, for example, simply uses `CROSS APPLY` instead of `LATERAL`. This should be an easy conversion.

