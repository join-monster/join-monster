import util from 'util'
import assert from 'assert'
import * as _ from 'lodash'

export default function stringifySqlAST(topNode) {
  validateSqlAST(topNode)
  const { selections, joins } = _stringifySqlAST(null, topNode, '', [], [])
  return 'SELECT\n  ' + _.uniq(selections).join(',\n  ') + '\n' + joins.join('\n')
}

function _stringifySqlAST(parent, node, prefix, selections, joins) {
  if (node.table) {
    if (node.sqlJoin) {
      // add join
      const joinCondition = node.sqlJoin(parent.as, node.as)

      joins.push(
        `LEFT JOIN ${JSON.stringify(node.table)} AS ${JSON.stringify(node.as)} ON ${joinCondition}`
      )
    } else {
      // add from to joins array
      joins.push(
        `FROM ${JSON.stringify(node.table)} AS ${JSON.stringify(node.fieldName)}`
      )
    }

    // recurse thru nodes
    for (let child of node.children) {
      _stringifySqlAST(node, child, parent ? prefix + node.as + '__' : prefix, selections, joins)
    }

  } else if (node.column) {
    selections.push(
      `${JSON.stringify(parent.as)}.${JSON.stringify(node.column)} AS ${JSON.stringify(prefix + node.column)}`
    )
  } else if (node.columnDeps) {
    node.columnDeps.forEach(col => selections.push(
      `${JSON.stringify(parent.as)}.${JSON.stringify(col)} AS ${JSON.stringify(prefix + col)}`
    ))
  } else {
    throw new Error('unexpected/unknown node type reached: ' + util.inspect(node))
  }
  return { selections, joins }
}

function validateSqlAST(topNode) {
  // topNode should not have a sqlJoin entry...
  assert(topNode.sqlJoin == null)
}
