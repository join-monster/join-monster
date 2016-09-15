import util from 'util'
import assert from 'assert'
import * as _ from 'lodash'

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

    const oneSpec = {
      ...(_.fromPairs(columnDeps.map(col => [ col, prefixToPass + col ]))),
      ...(_.fromPairs(columns.map(c => [ c.fieldName, prefixToPass + c.column ]))),
      // recurse
      ...(_.fromPairs(tables.map(t =>
        [ t.fieldName, _makeNestHydrationSpecForSqlAST(node, prefixToPass, t) ]
      )))
    }

    if (node.grabMany) {
      return [ oneSpec ]
    } else {
      return oneSpec
    }
  } else {
    throw new Error('unexpected/unknown node type reached: ' + util.inspect(node))
  }
}


function validateSqlAST(topNode) {
  // topNode should not have a sqlJoin entry...
  assert(topNode.sqlJoin == null)
}

