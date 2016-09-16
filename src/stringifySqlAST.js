import { validateSqlAST, inspect } from './util'

export default function stringifySqlAST(topNode) {
  validateSqlAST(topNode)
  let { selections, joins } = _stringifySqlAST(null, topNode, '', [], [])
  // make sure these are unique by converting to a set and then back to an array
  selections = [ ...new Set(selections) ]
  return 'SELECT\n  ' + selections.join(',\n  ') + '\n' + joins.join('\n')
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
    throw new Error('unexpected/unknown node type reached: ' + inspect(node))
  }
  return { selections, joins }
}

