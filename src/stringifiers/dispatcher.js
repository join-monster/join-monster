import assert from 'assert'
import { filter } from 'lodash'
import { validateSqlAST, inspect } from '../util'
import {
  joinPrefix,
  quotePrefix,
  thisIsNotTheEndOfThisBatch,
  handleOrderBy,
  whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch
} from './shared'

export default async function stringifySqlAST(topNode, context, options) {
  validateSqlAST(topNode)

  const dialect = require('./dialects/' + options.dialect)
  // recursively figure out all the selections, joins, and where conditions that we need
  let { selections, tables, wheres, orders } = await _stringifySqlAST(null, topNode, [], context, [], [], [], [], options.batchScope, dialect)

  // make sure these are unique by converting to a set and then back to an array
  // e.g. we want to get rid of things like `SELECT user.id as id, user.id as id, ...`
  // GraphQL does not prevent queries with duplicate fields
  selections = [ ...new Set(selections) ]

  // bail out if they made no selections 
  if (!selections.length) return ''

  // put together the SQL query
  let sql = 'SELECT\n  ' + 
    selections.join(',\n  ') + '\n' + 
    tables.join('\n')

  wheres = filter(wheres)
  if (wheres.length) {
    sql += '\nWHERE ' + wheres.join(' AND ')
  }

  if (orders.length) {
    sql += '\nORDER BY ' + stringifyOuterOrder(orders, dialect.quote)
  }

  return sql
}

async function _stringifySqlAST(parent, node, prefix, context, selections, tables, wheres, orders, batchScope, dialect) {
  const { quote: q } = dialect
  switch(node.type) {
  case 'table':
    await handleTable(parent, node, prefix, context, selections, tables, wheres, orders, batchScope, dialect)

    // recurse thru nodes
    if (thisIsNotTheEndOfThisBatch(node, parent)) {
      for (let child of node.children) {
        await _stringifySqlAST(node, child, [ ...prefix, node.as ], context, selections, tables, wheres, orders, null, dialect)
      }
    }

    break
  case 'column':
    selections.push(
      `${q(node.fromOtherTable || parent.as)}.${q(node.name)} AS ${q(joinPrefix(prefix) + node.as)}`
    )
    break
  case 'columnDeps':
    // grab the dependant columns
    for (let name in node.names) {
      selections.push(
        `${q(parent.as)}.${q(name)} AS ${q(joinPrefix(prefix) + node.names[name])}`
      )
    }
    break
  case 'composite':
    const parentTable = node.fromOtherTable || parent.as
    selections.push(
      `${dialect.compositeKey(parentTable, node.name)} AS ${q(joinPrefix(prefix) + node.as)}`
    )
    break
  case 'expression':
    const expr = await node.sqlExpr(`${q(parent.as)}`, node.args || {}, context, quotePrefix(prefix, q))
    selections.push(
      `${expr} AS ${q(joinPrefix(prefix) + node.as)}`
    )
    break
  case 'noop':
    // we hit this with fields that don't need anything from SQL, they resolve independantly
    return
  default:
    throw new Error('unexpected/unknown node type reached: ' + inspect(node))
  }
  return { selections, tables, wheres, orders }
}

async function handleTable(parent, node, prefix, context, selections, tables, wheres, orders, batchScope, dialect) {
  const { quote: q } = dialect
  // generate the "where" condition, if applicable
  if (node.where && whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch(node, parent)) {
    wheres.push(await node.where(`${q(node.as)}`, node.args || {}, context, quotePrefix(prefix, q)))
  }

  if (!node.paginate && node.orderBy && thisIsNotTheEndOfThisBatch(node, parent)) {
    orders.push({
      table: node.as,
      columns: handleOrderBy(node.orderBy)
    })
  }

  // one-to-many using JOIN
  if (node.sqlJoin) {
    const joinCondition = await node.sqlJoin(`${q(parent.as)}`, q(node.as), node.args || {}, context)

    // do we need to paginate? if so this will be a lateral join
    if (node.paginate) {
      await dialect.handleJoinedOneToManyPaginated(parent, node, prefix, context, selections, tables, wheres, orders, joinCondition)

    // otherwite, just a regular left join on the table
    } else {
      tables.push(
        `LEFT JOIN ${node.name} ${q(node.as)} ON ${joinCondition}`
      )
    }
  
  // many-to-many using batching
  } else if (node.junctionTable && node.junctionBatch) {
    if (parent) {
      selections.push(
        `${q(parent.as)}.${q(node.junctionBatch.parentKey.name)} AS ${q(joinPrefix(prefix) + node.junctionBatch.parentKey.as)}`
      )
    } else {
      const joinCondition = await node.junctionBatch.sqlJoin(`${q(node.junctionTableAs)}`, q(node.as), node.args || {}, context)
      if (node.paginate) {
        await dialect.handleBatchedManyToManyPaginated(parent, node, prefix, context, selections, tables, wheres, orders, batchScope, joinCondition)

      } else {
        tables.push(
          `FROM ${node.junctionTable} ${q(node.junctionTableAs)}`,
          `LEFT JOIN ${node.name} ${q(node.as)} ON ${joinCondition}`
        )
        // ensures only the correct records are fetched using the value of the parent key
        wheres.push(`${q(node.junctionTableAs)}.${q(node.junctionBatch.thisKey.name)} IN (${batchScope.join(',')})`)
      }
    }

  // many-to-many using JOINs
  } else if (node.junctionTable) {
    assert(node.sqlJoins, 'Must set "sqlJoins" for a join table.')
    const joinCondition1 = await node.sqlJoins[0](`${q(parent.as)}`, q(node.junctionTableAs), node.args || {}, context)
    const joinCondition2 = await node.sqlJoins[1](`${q(node.junctionTableAs)}`, q(node.as), node.args || {}, context)

    if (node.paginate) {
      await dialect.handleJoinedManyToManyPaginated(parent, node, prefix, context, selections, tables, wheres, orders, joinCondition1)

    } else {
      tables.push(
        `LEFT JOIN ${node.junctionTable} ${q(node.junctionTableAs)} ON ${joinCondition1}`
      )
    }
    tables.push(
      `LEFT JOIN ${node.name} ${q(node.as)} ON ${joinCondition2}`
    )

  // one-to-many with batching
  } else if (node.sqlBatch) {
    if (parent) {
      selections.push(
        `${q(parent.as)}.${q(node.sqlBatch.parentKey.name)} AS ${q(joinPrefix(prefix) + node.sqlBatch.parentKey.as)}`
      )
    } else {
      if (node.paginate) {
        await dialect.handleBatchedOneToManyPaginated(parent, node, prefix, context, selections, tables, wheres, orders, batchScope)

      } else {
        tables.push(
          `FROM ${node.name} ${q(node.as)}`
        )
        wheres.push(`${q(node.as)}.${q(node.sqlBatch.thisKey.name)} IN (${batchScope.join(',')})`)
      }
    }
  // otherwise, we aren't joining, so we are at the "root", and this is the start of the FROM clause
  } else if (node.paginate) {
    await dialect.handlePaginationAtRoot(parent, node, prefix, context, selections, tables, wheres, orders)
  } else {
    assert(!parent, `Object type for "${node.fieldName}" table must have a "sqlJoin" or "sqlBatch"`)
    tables.push(
      `FROM ${node.name} ${q(node.as)}`
    )
  }
}


// we need one ORDER BY clause on at the very end to make sure everything comes back in the correct order
// ordering inner(sub) queries DOES NOT guarantee the order of those results in the outer query
function stringifyOuterOrder(orders, q) {
  const conditions = []
  for (let condition of orders) {
    for (let column in condition.columns) {
      const direction = condition.columns[column]
      conditions.push(`${q(condition.table)}.${q(column)} ${direction}`)
    }
  }
  return conditions.join(', ')
}


