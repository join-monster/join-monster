export function joinPrefix(prefix) {
  return prefix.slice(1).map(name => name + '__').join('')
}

export function quotePrefix(prefix, quote = '"') {
  return prefix.map(name => quote.concat(name, quote)).reverse().slice(1)
}
