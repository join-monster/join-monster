import { inspect, validateSqlAST } from './util'

export default function defineObjectShape(topNode) {
  validateSqlAST(topNode)
  return _defineObjectShape(null, '', topNode)
}

function _defineObjectShape(parent, prefix, node) {
  if (node.type === 'table') {
    // if this table has a parent, prefix with the parent name and 2 underscores
    const prefixToPass = parent ? prefix + node.as + '__' : prefix

    const fieldDefinition = {}

    for (let child of node.children) {
      switch (child.type) {
      case 'column':
        fieldDefinition[child.fieldName] = prefixToPass + child.name
        break
      case 'composite':
        fieldDefinition[child.fieldName] = prefixToPass + child.fieldName
        break
      case 'columnDeps':
        child.name.forEach(name => fieldDefinition[name] = prefixToPass + name)
        break
      case 'table':
        const definition = _defineObjectShape(node, prefixToPass, child)
        fieldDefinition[child.fieldName] = definition
      }
    }

    if (node.grabMany) {
      return [ fieldDefinition ]
    } else {
      return fieldDefinition
    }
  } else {
    throw new Error('unexpected/unknown node type reached: ' + inspect(node))
  }
}

