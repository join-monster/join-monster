## Key Uniqueness

<div class="admonition danger">
  <p class="first admonition-title">Warning</p>
  <p class="last">
    Make sure the things that Join Monster assumes to be unique are actually unique.
  </p>
</div>

[Join Monster](https://github.com/join-monster/join-monster) uses unique keys for identification and de-duplicating objects. It never checks for any constraints in SQL. It assumes they are unique and will silently corrupt the data if they are not. If, for example, one field is a `new GraphQLList(SomeObject)` and that `SomeObject` contains a sub-field that is the same as other instances in this list, each instance will have a reference to the same object. If two rows have the same `id`, Join Monster will assume these are the same object and it can make multiple references to only one of these objects. Basically, the first instance of that `id` will overwrite any other places in which the other object would occur.

It also uses keys for [Keyset Pagination](/relay/#3-keyset-paging). The keys are what generate the cursors. If a cursor is not unique, it might skip a row if it has the same cursor as another item at the edge of a page.

In both cases, you do not need a single unique column. You can choose composite keys that derives uniqueness from a **combination** of columns.


## Mutating Objects

<div class="admonition danger">
  <p class="first admonition-title">Warning</p>
  <p class="last">
    Mutate objects returned by <code>joinMonster</code> with caution.
  </p>
</div>

As mentioned above, the client may incidentally request data from duplicate rows (inferred from the unique key). If you mutate an object and it is being referenced by another object in the data, it will be mutated there as well. Mutate data at your peril.

## Avoid Clashing

<div class="admonition danger">
  <p class="first admonition-title">Warning</p>
  <p class="last">
    Avoid field and column names containing <strong>$</strong>, <strong>#</strong>, or <strong>__</strong> (two underscores).
  </p>
</div>

Join Monster computes some columns for internal use. It also uses column aliases to infer the object structure, delimited by double underscores. Although unlikely, it's best to avoid risking name clashing and avoiding using these characters in your schemas.

## SQL Injection

<div class="admonition danger">
  <p class="first admonition-title">Warning</p>
  <p class="last">
    Escape string inputs to prevent SQL injection.
  </p>
</div>

Some functions accept values that the library will interpolate into the query, such as `joinMonster.getNode` or the `sortKey` function.
**These are properly escaped**.
However, some functions return RAW clauses into which may or may not accept untrustworthy user input.
If these are strings containing malicious code, a SQL injection attack can occur.
Such functions, like the `where`, `sqlJoin`, or `sqlExpr` function, should escape the input. See [this page](/where/) for example.

