import assert from 'assert'
import { filter } from 'lodash'
import { validateSqlAST, inspect, wrap } from '../util'
import {
  addToOrder,
  joinPrefix,
  orderColumnsToString,
  thisIsNotTheEndOfThisBatch,
  whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch
} from './shared'

export default async function stringifySqlAST(topNode, context, options) {
  validateSqlAST(topNode)

  let dialect = options.dialectModule

  if (!dialect && options.dialect) {
    dialect = require('./dialects/' + options.dialect)
  }

  // recursively figure out all the selections, joins, and where conditions that we need
  let { selections, tables, wheres, order } = await _stringifySqlAST(
    null,
    topNode,
    [], // prefix
    context,
    // Use a set for sleections to prevent duplicate fields.
    // GraphQL does not prevent queries with duplicate fields
    new Set(),
    [], // tables
    [], // wheres
    [], // order
    options.batchScope,
    dialect
  )

  // bail out if they made no selections
  if (!selections.size) return ''

  // put together the SQL query
  let sql = 'SELECT\n  ' + [ ...selections ].join(',\n  ') + '\n' + tables.join('\n')

  wheres = filter(wheres)
  if (wheres.length) {
    sql += '\nWHERE ' + wheres.join(' AND ')
  }

  if (order.length) {
    sql += '\nORDER BY ' + orderColumnsToString(order, dialect.quote)
  }

  return sql
}

async function _stringifySqlASTExpression(parent, node, prefix, context, expressions, dialect) {
  // Table from which the expression is calculated
  const sourceTable = node.fromOtherTable || (parent && parent.as)
  // The intermediate table to get the value from for a nested query
  const table = parent && parent.junction ? parent.junction.as : sourceTable
  const { quote: q } = dialect
  const expr = await node.sqlExpr(`${q(sourceTable)}`, node.args || {}, context, node)
  expressions.push({ table, expr, column: node.fieldName, as: joinPrefix(prefix) + node.as })
}

// Add non-generated SQL AST fields first, then the generated ones if they weren't already added
async function _stringifySqlASTExpressions(parent, expressionNodes, prefix, context, expressions, dialect) {
  const requestedFieldAs = new Set()
  const generatedFields = []
  for (let child of expressionNodes) {
    if (child.isGeneratedSortColumn) {
      generatedFields.push(child)
    } else {
      await _stringifySqlASTExpression(parent, child, prefix, context, expressions, dialect)
      requestedFieldAs.add(child.as)
    }
  }
  for (let child of generatedFields) {
    if (!requestedFieldAs.has(child.as)) {
      await _stringifySqlASTExpression(parent, child, prefix, context, expressions, dialect)
      requestedFieldAs.add(child.as)
    }
  }
}

async function _stringifySqlAST(parent, node, prefix, context, selections, tables, wheres, order, batchScope, dialect) {
  const { quote: q } = dialect
  const parentTable = node.fromOtherTable || (parent && parent.as)
  let expressionNodes
  let expressions
  switch (node.type) {
  case 'table':
    // recurse thru nodes
    expressions = []
    if (thisIsNotTheEndOfThisBatch(node, parent)) {
      expressionNodes = []
      for (let child of node.children) {
        if (child.type === 'expression') {
          expressionNodes.push(child)
        }
      }
      await _stringifySqlASTExpressions(node, expressionNodes, [ ...prefix, node.as ], context, expressions, dialect)
    }

    await handleTable(parent, node, prefix, context, selections, expressions, tables, wheres, order, batchScope, dialect)

    if (thisIsNotTheEndOfThisBatch(node, parent)) {
      for (let child of node.children) {
        await _stringifySqlAST(
          node,
          child,
          [ ...prefix, node.as ],
          context,
          selections,
          tables,
          wheres,
          order,
          null,
          dialect
        )
      }
    }
    break
  case 'union':
    // recurse thru nodes
    expressions = []
    if (thisIsNotTheEndOfThisBatch(node, parent)) {
      expressionNodes = []
      for (let typeName in node.typedChildren) {
        for (let child of node.typedChildren[typeName]) {
          if (child.type === 'expression') {
            expressionNodes.push(child)
          }
        }
      }
      for (let child of node.children) {
        if (child.type === 'expression') {
          expressionNodes.push(child)
        }
      }
      await _stringifySqlASTExpressions(node, expressionNodes, [ ...prefix, node.as ], context, expressions, dialect)
    }

    await handleTable(parent, node, prefix, context, selections, expressions, tables, wheres, order, batchScope, dialect)

    if (thisIsNotTheEndOfThisBatch(node, parent)) {
      for (let typeName in node.typedChildren) {
        for (let child of node.typedChildren[typeName]) {
          await _stringifySqlAST(
            node,
            child,
            [ ...prefix, node.as ],
            context,
            selections,
            tables,
            wheres,
            order,
            null,
            dialect
          )
        }
      }
      for (let child of node.children) {
        await _stringifySqlAST(
          node,
          child,
          [ ...prefix, node.as ],
          context,
          selections,
          tables,
          wheres,
          order,
          null,
          dialect
        )
      }
    }
    break
  case 'column':
    selections.add(`${q(parentTable)}.${q(node.name)} AS ${q(joinPrefix(prefix) + node.as)}`)
    break
  case 'columnDeps':
    // grab the dependant columns
    for (let name in node.names) {
      selections.add(`${q(parentTable)}.${q(name)} AS ${q(joinPrefix(prefix) + node.names[name])}`)
    }
    break
  case 'composite':
    selections.add(`${dialect.compositeKey(parentTable, node.name)} AS ${q(joinPrefix(prefix) + node.as)}`)
    break
  case 'expression':
    // Handled in _stringifySqlASTExpressions()
    break
  case 'noop':
    // we hit this with fields that don't need anything from SQL, they resolve independently
    return
  default:
    throw new Error('unexpected/unknown node type reached: ' + inspect(node))
  }
  return { selections, tables, wheres, order }
}

async function handleTable(
  parent,
  node,
  prefix,
  context,
  selections,
  expressions,
  tables,
  wheres,
  order,
  batchScope,
  dialect
) {
  let usedNestedQuery = false
  const { quote: q } = dialect
  // generate the "where" condition, if applicable
  if (whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch(node, parent)) {
    if (idx(node, _ => _.junction.where)) {
      wheres.push(await node.junction.where(`${q(node.junction.as)}`, node.args || {}, context, node))
    }
    if (node.where) {
      wheres.push(await node.where(`${q(node.as)}`, node.args || {}, context, node))
    }
  }

  // one-to-many using JOIN
  if (node.sqlJoin) {
    const joinCondition = await node.sqlJoin(`${q(parent.as)}`, q(node.as), node.args || {}, context, node)

    // do we need to paginate? if so this will be a lateral join
    if (node.paginate) {
      await dialect.handleJoinedOneToManyPaginated(parent, node, context, expressions, tables, joinCondition)
      usedNestedQuery = true
      // limit has a highly similar approach to paginating
    } else if (node.limit) {
      node.args.first = node.limit
      await dialect.handleJoinedOneToManyPaginated(parent, node, context, expressions, tables, joinCondition)
      usedNestedQuery = true
      // otherwite, just a regular left join on the table
    } else {
      tables.push(
        `LEFT JOIN ${node.name} ${q(node.as)} ON ${joinCondition}`
      )
    }

  // many-to-many using batching
  } else if (idx(node, _ => _.junction.sqlBatch)) {
    if (parent) {
      selections.add(
        `${q(parent.as)}.${q(node.junction.sqlBatch.parentKey.name)} AS ${q(
          joinPrefix(prefix) + node.junction.sqlBatch.parentKey.as
        )}`
      )
    } else {
      const joinCondition = await node.junction.sqlBatch.sqlJoin(
        `${q(node.junction.as)}`, q(node.as), node.args || {}, context, node
      )
      if (node.paginate) {
        await dialect.handleBatchedManyToManyPaginated(parent, node, context, expressions, tables, batchScope, joinCondition)
        usedNestedQuery = true
      } else if (node.limit) {
        node.args.first = node.limit
        await dialect.handleBatchedManyToManyPaginated(parent, node, context, expressions, tables, batchScope, joinCondition)
        usedNestedQuery = true
      } else {
        tables.push(
          `FROM ${node.junction.sqlTable} ${q(node.junction.as)}`,
          `LEFT JOIN ${node.name} ${q(node.as)} ON ${joinCondition}`
        )
        // ensures only the correct records are fetched using the value of the parent key
        wheres.push(`${q(node.junction.as)}.${q(node.junction.sqlBatch.thisKey.name)} IN (${batchScope.join(',')})`)
      }
    }

  // many-to-many using JOINs
  } else if (idx(node, _ => _.junction.sqlTable)) {
    const joinCondition1 = await node.junction
      .sqlJoins[0](`${q(parent.as)}`, q(node.junction.as), node.args || {}, context, node)
    const joinCondition2 = await node.junction
      .sqlJoins[1](`${q(node.junction.as)}`, q(node.as), node.args || {}, context, node)

    if (node.paginate) {
      await dialect.handleJoinedManyToManyPaginated(
        parent,
        node,
        context,
        expressions,
        tables,
        joinCondition1,
        joinCondition2
      )
      usedNestedQuery = true
    } else if (node.limit) {
      node.args.first = node.limit
      await dialect.handleJoinedManyToManyPaginated(
        parent,
        node,
        context,
        expressions,
        tables,
        joinCondition1,
        joinCondition2
      )
      usedNestedQuery = true
    } else {
      tables.push(`LEFT JOIN ${node.junction.sqlTable} ${q(node.junction.as)} ON ${joinCondition1}`)
    }
    tables.push(
      `LEFT JOIN ${node.name} ${q(node.as)} ON ${joinCondition2}`
    )

  // one-to-many with batching
  } else if (node.sqlBatch) {
    if (parent) {
      selections.add(
        `${q(parent.as)}.${q(node.sqlBatch.parentKey.name)} AS ${q(joinPrefix(prefix) + node.sqlBatch.parentKey.as)}`
      )
    } else if (node.paginate) {
      await dialect.handleBatchedOneToManyPaginated(parent, node, context, expressions, tables, batchScope)
      usedNestedQuery = true
    } else if (node.limit) {
      node.args.first = node.limit
      await dialect.handleBatchedOneToManyPaginated(parent, node, context, expressions, tables, batchScope)
      usedNestedQuery = true
      // otherwite, just a regular left join on the table
    } else {
      tables.push(
        `FROM ${node.name} ${q(node.as)}`
      )
      wheres.push(`${q(node.as)}.${q(node.sqlBatch.thisKey.name)} IN (${batchScope.join(',')})`)
    }
  // otherwise, we aren't joining, so we are at the "root", and this is the start of the FROM clause
  } else if (node.paginate) {
    await dialect.handlePaginationAtRoot(parent, node, context, expressions, tables)
    usedNestedQuery = true
  } else if (node.limit) {
    node.args.first = node.limit
    await dialect.handlePaginationAtRoot(parent, node, context, expressions, tables)
    usedNestedQuery = true
  } else {
    assert(!parent, `Object type for "${node.fieldName}" table must have a "sqlJoin" or "sqlBatch"`)
    tables.push(`FROM ${node.name} ${q(node.as)}`)
  }

  // Add any unused expressions to the selections
  if (usedNestedQuery) {
    expressions.forEach(expr => selections.add(`${q(expr.table)}.${q(expr.as)} AS ${q(expr.as)}`))
  } else {
    expressions.forEach(expr => selections.add(`${expr.expr} AS ${q(expr.as)}`))
  }

  if (thisIsNotTheEndOfThisBatch(node, parent)) {
    if (idx(node, _ => _.junction.orderBy)) {
      addOrderByToOrder(order, node.junction.orderBy, node.junction.as, expressions, !usedNestedQuery)
    }
    if (node.orderBy) {
      addOrderByToOrder(order, node.orderBy, node.as, expressions, !usedNestedQuery)
    }
    if (idx(node, _ => _.junction.sortKey)) {
      addSortKeyToOrder(order, node.junction.sortKey, node.args, node.junction.as, expressions, !usedNestedQuery)
    }
    if (node.sortKey) {
      addSortKeyToOrder(order, node.sortKey, node.args, node.as, expressions, !usedNestedQuery)
    }
  }
}

function addSortKeyToOrder(order, sortKey, args, as, expressions, stripTable) {
  let descending = sortKey.order.toUpperCase() === 'DESC'
  if (args && args.last) {
    descending = !descending
  }
  for (const column of wrap(sortKey.key)) {
    const direction = descending ? 'DESC' : 'ASC'
    addToOrder(order, column, direction, as, expressions, stripTable)
  }
}

function addOrderByToOrder(order, orderBy, as, expressions, stripTable) {
  for (const column in orderBy) {
    const direction = orderBy[column]
    addToOrder(order, column, direction, as, expressions, stripTable)
  }
}

