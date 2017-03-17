## Stringifying

The entry point to this process is `dispatcher.js`.
This is basically a giant nested `switch`/`if`/`else` to figure out what kind of clause(s) are needed.
The dispatcher can handle most cases, as the SQL is pretty portable.
There are certain cases where it just defers to a specific dialect object, in the `dialects` directory.
Each dialect must implement certain cases (functions) to plug into the dispatcher:

1. quote
1. compositeKey
1. handlePaginationAtRoot
1. handleJoinedOneToManyPaginated
1. handleJoinedManyToManyPaginated
1. handleBatchedManyToManyPaginated
1. handleBatchedOneToManyPaginated

Implementing a new dialect should just mean creating a new object with those methods in a file inside `dialects`.

