import { validateSqlAST, inspect } from './util'
import idx from 'idx'
import { getAliasKey, hasConflictingSiblings, resolveAliasValue } from './aliases'

// generate an object that defines the correct nesting shape for our GraphQL
// this will be used by the library NestHydrationJS, check out their docs
export default function defineObjectShape(topNode) {
  validateSqlAST(topNode)
  return _defineObjectShape(null, '', topNode)
}

function _defineObjectShape(parent, prefix, node) {
  // if this table has a parent, prefix with the parent name and 2 underscores
  const prefixToPass = parent ? prefix + node.as + '__' : prefix

  const fieldDefinition = {}

  for (let child of node.children) {
    const setField = definition => {
      const originalKey = child.fieldName

      if (hasConflictingSiblings(child, node.children) && !child.sqlBatch) {
        const aliasKey = getAliasKey(originalKey, child.alias)
        
        fieldDefinition[aliasKey] = definition
        fieldDefinition[originalKey] = {
          column: '__jm__' + aliasKey, // non-existent key
          // we abuse the type handler to place our resolver function into the object instead of a value
          type: () => resolveAliasValue
        }
      } else {
        fieldDefinition[originalKey] = definition
      }
    }

    switch (child.type) {
      case 'column':
        setField(prefixToPass + child.as)
        break
      case 'composite':
        setField(prefixToPass + child.as)
        break
      case 'columnDeps':
        for (let name in child.names) {
          fieldDefinition[name] = prefixToPass + child.names[name]
        }
        break
      case 'expression':
        setField(prefixToPass + child.as)
        break
      case 'union':
      case 'table':
        if (child.sqlBatch) {
          fieldDefinition[child.sqlBatch.parentKey.fieldName] =
            prefixToPass + child.sqlBatch.parentKey.as
        } else {
          const definition = _defineObjectShape(node, prefixToPass, child)
          setField(definition)
        }
        break
      case 'noop':
        void 0
        break
      /* istanbul ignore next */
      default:
        throw new Error(`invalid SQLASTNode type: ${inspect(child.type)}`)
    }
  }

  for (let typeName in node.typedChildren || {}) {
    const suffix = '@' + typeName

    for (let child of node.typedChildren[typeName]) {
      const setField = definition => {
        const originalKey = child.fieldName + suffix
  
        if (hasConflictingSiblings(child, node.typedChildren[typeName]) && !child.sqlBatch) {
          const aliasKey = getAliasKey(originalKey, child.alias)
          
          fieldDefinition[aliasKey] = definition
          fieldDefinition[originalKey] = {
            column: '__jm__' + aliasKey, // non-existent key
            // we abuse the type handler to place our resolver function into the object instead of a value
            type: () => resolveAliasValue
          }
        } else {
          fieldDefinition[originalKey] = definition
        }
      }

      switch (child.type) {
        case 'column':
          setField(prefixToPass + child.as)
          break
        case 'composite':
          setField(prefixToPass + child.as)
          break
        case 'columnDeps':
          for (let name in child.names) {
            fieldDefinition[name + suffix] = prefixToPass + child.names[name]
          }
          break
        case 'expression':
          setField(prefixToPass + child.as)
          break
        case 'union':
        case 'table':
          if (child.sqlBatch) {
            fieldDefinition[child.sqlBatch.parentKey.fieldName + suffix] =
              prefixToPass + child.sqlBatch.parentKey.as
          } else if (idx(child, _ => _.junction.sqlBatch)) {
            fieldDefinition[
              child.junction.sqlBatch.parentKey.fieldName + suffix
            ] = prefixToPass + child.junction.sqlBatch.parentKey.as
          } else {
            const definition = _defineObjectShape(node, prefixToPass, child)
            setField(definition)
          }
          break
        case 'noop':
          void 0
          break
        /* istanbul ignore next */
        default:
          throw new Error(`invalid SQLASTNode type: ${inspect(child.type)}`)
      }
    }
  }

  // if we need many, just wrap the field definition in an array
  if (node.grabMany) {
    return [fieldDefinition]
    // otherwise, it will just grab the first result
  }
  return fieldDefinition
}
