import { inspect, validateSqlAST } from './util'

export default function makeNestHydrationSpec(topNode) {
  validateSqlAST(topNode)
  return _makeNestHydrationSpecForSqlAST(null, '', topNode)
}

function _makeNestHydrationSpecForSqlAST(parent, prefix, node) {
  if (node.table) {
    const prefixToPass = parent ? prefix + node.as + '__' : prefix
    let columnDeps = new Set
    for (let c of node.children) {
      if (c.columnDeps) c.columnDeps.forEach(::columnDeps.add)
    }

    columnDeps = Array.from(columnDeps)
    const columns = node.children.filter(c => c.column)
    const tables = node.children.filter(c => c.table)

    const fieldSpec = {}
    columnDeps.forEach(col => fieldSpec[col] = prefixToPass + col)
    columns.forEach(col => fieldSpec[col.fieldName] = prefixToPass + col.column)
    for (let table of tables) {
      const spec = _makeNestHydrationSpecForSqlAST(node, prefixToPass, table)
      fieldSpec[table.fieldName] = spec
    }

    if (node.grabMany) {
      return [ fieldSpec ]
    } else {
      return fieldSpec
    }
  } else {
    throw new Error('unexpected/unknown node type reached: ' + inspect(node))
  }
}

