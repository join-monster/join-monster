import util from 'util'
import { filter } from 'lodash'
import { cursorToOffset } from 'graphql-relay'
import { wrap, cursorToObj, maybeQuote } from '../util'

export function joinPrefix(prefix) {
  return prefix.slice(1).map(name => name + '__').join('')
}

function doubleQuote(str) {
  return `"${str}"`
}

export function quotePrefix(prefix, q = doubleQuote) {
  return prefix.map(name => q(name))
}

export function thisIsNotTheEndOfThisBatch(node, parent) {
  return (!node.sqlBatch && !node.junctionBatch) || !parent
}

export function thisIsTheEndOfThisBatch(node, parent) {
  return (node.sqlBatch || node.junctionBatch) && parent
}

export function whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch(node, parent) {
  return !node.paginate && (!node.sqlBatch || !parent)
}

export function keysetPagingSelect(table, whereCondition, orderColumns, limit, as, options = {}) {
  let { joinCondition, joinType, q } = options
  q = q || doubleQuote
  whereCondition = filter(whereCondition).join(' AND ') || 'TRUE'
  if (joinCondition) {
    return `\
${joinType || ''} JOIN LATERAL (
  SELECT * FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns, q)}
  LIMIT ${limit}
) ${q(as)} ON ${joinCondition}`
  } else {
    return `\
FROM (
  SELECT * FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns, q)}
  LIMIT ${limit}
) ${q(as)}`
  }
}

export function offsetPagingSelect(table, pagingWhereConditions, orderColumns, limit, offset, as, options = {}) {
  let { joinCondition, joinType, q } = options
  q = q || doubleQuote
  const whereCondition = filter(pagingWhereConditions).join(' AND ') || 'TRUE'
  if (joinCondition) {
    return `\
${joinType || ''} JOIN LATERAL (
  SELECT *, count(*) OVER () AS ${q('$total')}
  FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns, q)}
  LIMIT ${limit} OFFSET ${offset}
) ${q(as)} ON ${joinCondition}`
  } else {
    return `\
FROM (
  SELECT *, count(*) OVER () AS ${q('$total')}
  FROM ${table}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(orderColumns, q)}
  LIMIT ${limit} OFFSET ${offset}
) ${q(as)}`
  }
}

export function orderColumnsToString(orderColumns, q) {
  q = q || doubleQuote
  const conditions = []
  for (let column in orderColumns) {
    conditions.push(`${q(column)} ${orderColumns[column]}`)
  }
  return conditions.join(', ')
}

export function handleOrderBy(orderBy) {
  const orderColumns = {}
  if (typeof orderBy === 'object') {
    for (let column in orderBy) {
      let direction = orderBy[column].toUpperCase()
      if (direction !== 'ASC' && direction !== 'DESC') {
        throw new Error (direction + ' is not a valid sorting direction')
      }
      orderColumns[column] = direction
    }
  } else if (typeof orderBy === 'string') {
    orderColumns[orderBy] = 'ASC'
  } else {
    throw new Error('"orderBy" is invalid type: ' + util.inspect(orderBy))
  }
  return orderColumns
}

// find out what the limit, offset, order by parts should be from the relay connection args if we're paginating
export function interpretForOffsetPaging(node, dialect) {
  const { name } = dialect
  if (node.args && node.args.last) {
    throw new Error('Backward pagination not supported with offsets. Consider using keyset pagination instead')
  }
  const orderColumns = handleOrderBy(node.orderBy)
  let limit = [ 'mariadb', 'mysql' ].includes(name) ? '18446744073709551615' : 'ALL'
  let offset = 0
  if (node.args && node.args.first) {
    // we'll get one extra item (hence the +1). this is to determine if there is a next page or not
    limit = parseInt(node.args.first) + 1
    if (node.args.after) {
      offset = cursorToOffset(node.args.after) + 1
    }
  }
  return { limit, offset, orderColumns }
}

export function interpretForKeysetPaging(node, dialect) {
  const { name, quote } = dialect
  const orderColumns = {}
  let descending = node.sortKey.order.toUpperCase() === 'DESC'
  // flip the sort order if doing backwards paging
  if (node.args && node.args.last) {
    descending = !descending
  }
  for (let column of wrap(node.sortKey.key)) {
    orderColumns[column] = descending ? 'DESC' : 'ASC'
  }

  let limit = [ 'mariadb', 'mysql' ].includes(name) ? '18446744073709551615' : 'ALL'
  let whereCondition = ''
  if (node.args && node.args.first) {
    limit = parseInt(node.args.first) + 1
    if (node.args.after) {
      const cursorObj = cursorToObj(node.args.after)
      validateCursor(cursorObj, wrap(node.sortKey.key))
      whereCondition = sortKeyToWhereCondition(cursorObj, descending, quote)
    }
    if (node.args.before) {
      throw new Error('Using "before" with "first" is nonsensical.')
    }
  } else if (node.args && node.args.last) {
    limit = parseInt(node.args.last) + 1
    if (node.args.before) {
      const cursorObj = cursorToObj(node.args.before)
      validateCursor(cursorObj, wrap(node.sortKey.key))
      whereCondition = sortKeyToWhereCondition(cursorObj, descending, quote)
    }
    if (node.args.after) {
      throw new Error('Using "after" with "last" is nonsensical.')
    }
  }

  return { limit, orderColumns, whereCondition }
}

// the cursor contains the sort keys. it needs to match the keys specified in the `sortKey` on this field in the schema
export function validateCursor(cursorObj, expectedKeys) {
  const actualKeys = Object.keys(cursorObj)
  const expectedKeySet = new Set(expectedKeys)
  const actualKeySet = new Set(actualKeys)
  for (let key of actualKeys) {
    if (!expectedKeySet.has(key)) {
      throw new Error(`Invalid cursor. The column "${key}" is not in the sort key.`)
    }
  }
  for (let key of expectedKeys) {
    if (!actualKeySet.has(key)) {
      throw new Error(`Invalid cursor. The column "${key}" is not in the cursor.`)
    }
  }
}

// take the sort key and translate that for the where clause
function sortKeyToWhereCondition(keyObj, descending, q) {
  const sortColumns = []
  const sortValues = []
  for (let key in keyObj) {
    sortColumns.push(`${q(key)}`)
    sortValues.push(maybeQuote(keyObj[key]))
  }
  const operator = descending ? '<' : '>'
  return `(${sortColumns.join(', ')}) ${operator} (${sortValues.join(', ')})`
}

