import { validateSqlAST, inspect } from './util'

export default function stringifySqlAST(topNode, context) {
  validateSqlAST(topNode)
  let { selections, joins, wheres } = _stringifySqlAST(null, topNode, '', context, [], [], [])
  // make sure these are unique by converting to a set and then back to an array
  selections = [ ...new Set(selections) ]
  return 'SELECT\n  ' + selections.join(',\n  ') + '\n' + joins.join('\n') + '\n' + wheres.join('\n')
}

function _stringifySqlAST(parent, node, prefix, context, selections, joins, wheres) {
  if (node.table) {

    if (node.where) {
      const whereCondition = node.where(node.as, node.args || {}, context) 
      if (whereCondition) {
        wheres.push(`WHERE ${whereCondition}`)
      }
    }
    if (node.sqlJoin) {
      // select * from accounts a join relationships r on a.id = r.follower_id join accounts b on b.id = r.followee_id
      // add join
      const joinCondition = node.sqlJoin(parent.as, node.as)

      joins.push(
        `LEFT JOIN ${node.table} AS ${node.as} ON ${joinCondition}`
      )
    } else if (node.joinTable) {
      if (!node.sqlJoins) throw new Error('Must set "sqlJoins" for a join table.')
      const joinCondition1 = node.sqlJoins[0](parent.as, node.joinTableAs)
      const joinCondition2 = node.sqlJoins[1](node.joinTableAs, node.as)

      joins.push(
        `LEFT JOIN ${node.joinTable} AS ${node.joinTableAs} ON ${joinCondition1}`,
        `LEFT JOIN ${node.table} AS ${node.as} ON ${joinCondition2}`
      )
    } else {
      // add from to joins array
      joins.push(
        `FROM ${node.table} AS ${node.fieldName}`
      )
    }

    // recurse thru nodes
    for (let child of node.children) {
      _stringifySqlAST(node, child, parent ? prefix + node.as + '__' : prefix, context, selections, joins, wheres)
    }

  } else if (node.column) {
    selections.push(
      `${parent.as}.${node.column} AS ${prefix + node.column}`
    )
  } else if (node.columnDeps) {
    node.columnDeps.forEach(col => selections.push(
      `${parent.as}.${col} AS ${prefix + col}`
    ))
  } else {
    throw new Error('unexpected/unknown node type reached: ' + inspect(node))
  }
  return { selections, joins, wheres }
}

