export function joinPrefix(prefix) {
  return prefix.slice(1).map(name => name + '__').join('')
}
