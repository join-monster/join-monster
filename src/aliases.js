import { isEqual } from 'lodash'

// If the same field is requested through multiple aliases,
// we modify the object shape in the following way
// - obj[<fieldName>] => resolver function that looks up the correct key based on the alias
// - obj[<fieldName>$<alias>] => value for alias
// - obj[<fieldName>$] => value for access without alias
const aliasSeparator = '$'

export function getAliasKey(fieldName, alias) {
  return fieldName + aliasSeparator + (alias || '')
}

// Types that never conflict even if they have aliases with different args.
// That usually means the args are not used by join-monster itself.
const neverConflictingTypes = ['noop', 'column', 'sqlDeps']

// Types that always conflict even if their aliases have the same args.
// That usually means they can have nested conflicts.
const alwaysConflictingTypes = ['table', 'union']

// Siblings are generally considered conflicting if they access the same field through different aliases.
// As it changes the output for custom resolvers, we do our best to only mark nodes as conflicting
// that actually need it to return the correct data.
export function hasConflictingSiblings(node, siblings) {
  return !neverConflictingTypes.includes(node.type)
    && siblings.some(sibling => (
      sibling !== node
      && sibling.fieldName === node.fieldName
      && sibling.alias !== node.alias
      && !neverConflictingTypes.includes(sibling.type)
      && (
        alwaysConflictingTypes.includes(sibling.type)
        // Fall back to comparing the args. This is mostly relevant for things like
        // sqlExpr, which might use args in the query
        || !isEqual(node.args || {}, sibling.args || {})
      )
    ))
}

// GraphQL's default resolver supports functions instead of values on source[fieldName],
// and will call this function with the information required that we can
// return the correct value for the field's alias
export function resolveAliasValue(args, context, info) {
  if (!info.fieldNodes || !info.fieldNodes[0]) return null
  
  const alias = info.fieldNodes[0].alias && info.fieldNodes[0].alias.value

  // "this" is the source object that contains the aliased field values
  return this[getAliasKey(info.fieldName, alias)]
}
