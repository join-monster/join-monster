import { inspect, validateSqlAST } from './util'

export default function makeNestHydrationSpec(topNode) {
  validateSqlAST(topNode)
  return _makeNestHydrationSpecForSqlAST(null, '', topNode)
}

function _makeNestHydrationSpecForSqlAST(parent, prefix, node) {
  if (node.table) {
    // if this table has a parent, prefix with the parent name and 2 underscores
    const prefixToPass = parent ? prefix + node.as + '__' : prefix
    // collect all the column deps and uniq them using a Set
    let columnDeps = new Set
    for (let c of node.children) {
      if (c.columnDeps) c.columnDeps.forEach(::columnDeps.add)
    }
    columnDeps = Array.from(columnDeps)

    // separate columns and tables
    const columns = node.children.filter(c => c.column)
    const tables = node.children.filter(c => c.table)

    const fieldDefinition = {}
    columnDeps.forEach(col => fieldDefinition[col] = prefixToPass + col)
    columns.forEach(col => fieldDefinition[col.fieldName] = prefixToPass + col.column)
    // then recurse on each table
    for (let table of tables) {
      const spec = _makeNestHydrationSpecForSqlAST(node, prefixToPass, table)
      fieldDefinition[table.fieldName] = spec
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

