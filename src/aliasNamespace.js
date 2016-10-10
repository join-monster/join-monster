import G from 'generatorics'

export default class AliasNamespace {
  constructor(minify) {
    this.minify = !!minify
    // a generator for infinite alias names, starting with the shortest possible
    this.mininym = G.baseNAll('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#$')
    this.usedTableAliases = new Set
  }

  generate(type, name) {
    // if minifiying, just make everything ugly and unique.
    if (this.minify) {
      return this.mininym.next().value.join('')
    }
    // otherwise, lets make it readable
    // if its a column, we dont need to worry about the uniqueness because the columns will get prefixed with the parent(s)
    // field names, which themselves are unique
    if (type === 'column') {
      return name
    }
    // the table aliases must be unique though
    // just append a "$" until its a unique name
    while (this.usedTableAliases.has(name)) {
      name += '$'
    }
    this.usedTableAlias.add(name)
    return name
  }
}
