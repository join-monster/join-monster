import assert from 'assert'
import { filter } from 'lodash'
import { cursorToOffset } from 'graphql-relay'
import { wrap, cursorToObj, maybeQuote } from '../util'
import idx from 'idx'

export function joinPrefix(prefix) {
  return prefix
    .slice(1)
    .map(name => name + '__')
    .join('')
}

export function generateCastExpressionFromValueType(key, val) {
  const castTypes = {
    string: 'TEXT'
  }
  const type = castTypes[typeof val] || null

  if (type) {
    return `CAST(${key} AS ${type})`
  }
  return key
}

function doubleQuote(str) {
  return `"${str}"`
}

export function thisIsNotTheEndOfThisBatch(node, parent) {
  return (!node.sqlBatch && !idx(node, _ => _.junction.sqlBatch)) || !parent
}

export function whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch(
  node,
  parent
) {
  return (
    !node.paginate &&
    (!(node.sqlBatch || idx(node, _ => _.junction.sqlBatch)) || !parent)
  )
}

export function sortKeyToOrderings(sortKey, args) {
  const orderColumns = []
  let flip = false
  // flip the sort order if doing backwards paging
  if (args && args.last) {
    flip = true
  }

  if (Array.isArray(sortKey)) {
    for (const { column, direction } of sortKey) {
      assert(
        column,
        `Each "sortKey" array entry must have a 'column' and a 'direction' property`
      )
      let descending = direction.toUpperCase() === 'DESC'
      if (flip) descending = !descending

      orderColumns.push({ column, direction: descending ? 'DESC' : 'ASC' })
    }
  } else {
    assert(sortKey.order, 'A "sortKey" object must have an "order"')
    let descending = sortKey.order.toUpperCase() === 'DESC'
    if (flip) descending = !descending

    for (const column of wrap(sortKey.key)) {
      orderColumns.push({ column, direction: descending ? 'DESC' : 'ASC' })
    }
  }

  return orderColumns
}

export function keysetPagingSelect(
  table,
  whereCondition,
  order,
  limit,
  as,
  options = {}
) {
  let { joinCondition, joinType, extraJoin, q } = options
  q = q || doubleQuote
  whereCondition = filter(whereCondition).join(' AND ') || 'TRUE'
  if (joinCondition) {
    return `\
${joinType || ''} JOIN LATERAL (
  SELECT ${q(as)}.*
  FROM ${table} ${q(as)}
  ${
    extraJoin
      ? `LEFT JOIN ${extraJoin.name} ${q(extraJoin.as)}
    ON ${extraJoin.condition}`
      : ''
  }
  WHERE ${whereCondition}
  ORDER BY ${orderingsToString(order.columns, q, order.table)}
  LIMIT ${limit}
) ${q(as)} ON ${joinCondition}`
  }

  return `\
FROM (
  SELECT ${q(as)}.*
  FROM ${table} ${q(as)}
  WHERE ${whereCondition}
  ORDER BY ${orderingsToString(order.columns, q, order.table)}
  LIMIT ${limit}
) ${q(as)}`
}

export function offsetPagingSelect(
  table,
  pagingWhereConditions,
  order,
  limit,
  offset,
  as,
  options = {}
) {
  let { joinCondition, joinType, extraJoin, q } = options
  q = q || doubleQuote
  const whereCondition = filter(pagingWhereConditions).join(' AND ') || 'TRUE'
  if (joinCondition) {
    return `\
${joinType || ''} JOIN LATERAL (
  SELECT ${q(as)}.*, count(*) OVER () AS ${q('$total')}
  FROM ${table} ${q(as)}
  ${
    extraJoin
      ? `LEFT JOIN ${extraJoin.name} ${q(extraJoin.as)}
    ON ${extraJoin.condition}`
      : ''
  }
  WHERE ${whereCondition}
  ORDER BY ${orderingsToString(order.columns, q, order.table)}
  LIMIT ${limit} OFFSET ${offset}
) ${q(as)} ON ${joinCondition}`
  }
  return `\
FROM (
  SELECT ${q(as)}.*, count(*) OVER () AS ${q('$total')}
  FROM ${table} ${q(as)}
  WHERE ${whereCondition}
  ORDER BY ${orderingsToString(order.columns, q, order.table)}
  LIMIT ${limit} OFFSET ${offset}
) ${q(as)}`
}

export function orderingsToString(orderings, q, as) {
  const orderByClauses = []
  for (const ordering of orderings) {
    orderByClauses.push(
      `${as ? q(as) + '.' : ''}${q(ordering.column)} ${ordering.direction}`
    )
  }
  return orderByClauses.join(', ')
}

// find out what the limit, offset, order by parts should be from the relay connection args if we're paginating
export function interpretForOffsetPaging(node, dialect) {
  const { name } = dialect
  if (idx(node, _ => _.args.last)) {
    throw new Error(
      'Backward pagination not supported with offsets. Consider using keyset pagination instead'
    )
  }

  const order = {}
  if (node.orderBy) {
    order.table = node.as
    order.columns = node.orderBy
  } else {
    order.table = node.junction.as
    order.columns = node.junction.orderBy
  }

  let limit = ['mariadb', 'mysql', 'oracle'].includes(name)
    ? '18446744073709551615'
    : 'ALL'
  if (idx(node, _ => _.defaultPageSize)) {
    limit = node.defaultPageSize + 1
  }
  let offset = 0
  if (idx(node, _ => _.args.first)) {
    limit = parseInt(node.args.first, 10)
    // we'll get one extra item (hence the +1). this is to determine if there is a next page or not
    if (node.paginate) {
      limit++
    }
    if (node.args.after) {
      offset = cursorToOffset(node.args.after) + 1
    }
  }
  return { limit, offset, order }
}

export function interpretForKeysetPaging(node, dialect) {
  const { name } = dialect

  let sortTable
  let sortKey
  if (node.sortKey) {
    sortKey = node.sortKey
    sortTable = node.as
  } else {
    sortKey = node.junction.sortKey
    sortTable = node.junction.as
  }

  const order = {
    table: sortTable,
    columns: sortKeyToOrderings(sortKey, node.args)
  }
  const cursorKeys = order.columns.map(ordering => ordering.column)

  let limit = ['mariadb', 'mysql', 'oracle'].includes(name)
    ? '18446744073709551615'
    : 'ALL'
  let whereCondition = ''
  if (idx(node, _ => _.defaultPageSize)) {
    limit = node.defaultPageSize + 1
  }

  if (idx(node, _ => _.args.first)) {
    limit = parseInt(node.args.first, 10) + 1
    if (node.args.after) {
      const cursorObj = cursorToObj(node.args.after)
      validateCursor(cursorObj, cursorKeys)
      whereCondition = sortKeyToWhereCondition(
        cursorObj,
        order.columns,
        sortTable,
        dialect
      )
    }
    if (node.args.before) {
      throw new Error('Using "before" with "first" is nonsensical.')
    }
  } else if (idx(node, _ => _.args.last)) {
    limit = parseInt(node.args.last, 10) + 1
    if (node.args.before) {
      const cursorObj = cursorToObj(node.args.before)
      validateCursor(cursorObj, cursorKeys)
      whereCondition = sortKeyToWhereCondition(
        cursorObj,
        order.columns,
        sortTable,
        dialect
      )
    }
    if (node.args.after) {
      throw new Error('Using "after" with "last" is nonsensical.')
    }
  }

  return { limit, order, whereCondition }
}

// the cursor contains the sort keys. it needs to match the keys specified in the `sortKey` on this field in the schema
export function validateCursor(cursorObj, expectedKeys) {
  const actualKeys = Object.keys(cursorObj)
  const expectedKeySet = new Set(expectedKeys)
  const actualKeySet = new Set(actualKeys)
  for (let key of actualKeys) {
    if (!expectedKeySet.has(key)) {
      throw new Error(
        `Invalid cursor. The column "${key}" is not in the sort key.`
      )
    }
  }
  for (let key of expectedKeys) {
    if (!actualKeySet.has(key)) {
      throw new Error(
        `Invalid cursor. The column "${key}" is not in the cursor.`
      )
    }
  }
}

// Returns the SQL implementation of the sort key cursor WHERE conditions
// Note: This operation compares the first key, then the second key, then the third key, etc, in order and independently. It's not a A > B AND C > D because C and D should only be compared of A and B are equal. If there are many sortKeys, then we need to implement the heirarchical comparison between them.
// See https://engineering.shopify.com/blogs/engineering/pagination-relative-cursors for an explanation of what this is doing
function sortKeyToWhereCondition(keyObj, orderings, sortTable, dialect) {
  const condition = (ordering, operator) => {
    operator = operator || (ordering.direction === 'DESC' ? '<' : '>')
    return `${dialect.quote(sortTable)}.${dialect.quote(
      ordering.column
    )} ${operator} ${maybeQuote(keyObj[ordering.column], dialect.name)}`
  }

  orderings = [...orderings] // don't mutate caller's data

  // this is some mind bendy stuff: we move from the most specific to the least specific ordering, wrapping the condition in successive equality checks to only use the more specific one if everthing less specific is equal
  return (
    '(' +
    orderings.reduceRight((agg, ordering) => {
      return `
      ${condition(ordering)}
      OR (${condition(ordering, '=')} AND ${agg})`
    }, condition(orderings.pop())) +
    ')'
  )
}
