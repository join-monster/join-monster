## On Object Types

`alwaysFetch`: `String|Array.<String>` - A column name (or array of column names) of columns that should always appear in the hydrated data even if the client did not request it.
This can be useful for columns that are needed for business logic, columns that don't appear in the public API, resolving *types* for unions and interfaces ([see here](/unions)).


## On Fields

`jmIgnoreAll`: `Boolean` - Set to `true` to ignore all Join Monster related properties.

`jmIgnoreTable`: `Boolean` - If a field's type is an object type which has a `sqlTable`, set this to `true` to ignore the `sqlTable`. Join Monster will still look for properties like `sqlDeps`, so you can still write a resolver that depends on some columns in the parent.
