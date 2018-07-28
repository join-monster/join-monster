'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.joinPrefix = joinPrefix;
exports.thisIsNotTheEndOfThisBatch = thisIsNotTheEndOfThisBatch;
exports.whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch = whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch;
exports.keysetPagingSelect = keysetPagingSelect;
exports.offsetPagingSelect = offsetPagingSelect;
exports.orderColumnsToString = orderColumnsToString;
exports.interpretForOffsetPaging = interpretForOffsetPaging;
exports.interpretForKeysetPaging = interpretForKeysetPaging;
exports.validateCursor = validateCursor;

var _lodash = require('lodash');

var _graphqlRelay = require('graphql-relay');

var _util = require('../util');

function joinPrefix(prefix) {
  return prefix.slice(1).map(name => name + '__').join('');
}

function doubleQuote(str) {
  return `"${str}"`;
}

function thisIsNotTheEndOfThisBatch(node, parent) {
  var _ref8;

  return !node.sqlBatch && !((_ref8 = node) != null ? (_ref8 = _ref8.junction) != null ? _ref8.sqlBatch : _ref8 : _ref8) || !parent;
}

function whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch(node, parent) {
  var _ref7;

  return !node.paginate && (!(node.sqlBatch || ((_ref7 = node) != null ? (_ref7 = _ref7.junction) != null ? _ref7.sqlBatch : _ref7 : _ref7)) || !parent);
}

function keysetPagingSelect(table, whereCondition, order, limit, as, options = {}) {
  let { joinCondition, joinType, extraJoin, q } = options;
  q = q || doubleQuote;
  whereCondition = (0, _lodash.filter)(whereCondition).join(' AND ') || 'TRUE';
  if (joinCondition) {
    return `\
${joinType || ''} JOIN LATERAL (
  SELECT ${q(as)}.*
  FROM ${table} ${q(as)}
  ${extraJoin ? `LEFT JOIN ${extraJoin.name} ${q(extraJoin.as)}
    ON ${extraJoin.condition}` : ''}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(order.columns, q, order.table)}
  LIMIT ${limit}
) ${q(as)} ON ${joinCondition}`;
  }
  return `\
FROM (
  SELECT ${q(as)}.*
  FROM ${table} ${q(as)}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(order.columns, q, order.table)}
  LIMIT ${limit}
) ${q(as)}`;
}

function offsetPagingSelect(table, pagingWhereConditions, order, limit, offset, as, options = {}) {
  let { joinCondition, joinType, extraJoin, q } = options;
  q = q || doubleQuote;
  const whereCondition = (0, _lodash.filter)(pagingWhereConditions).join(' AND ') || 'TRUE';
  if (joinCondition) {
    return `\
${joinType || ''} JOIN LATERAL (
  SELECT ${q(as)}.*, count(*) OVER () AS ${q('$total')}
  FROM ${table} ${q(as)}
  ${extraJoin ? `LEFT JOIN ${extraJoin.name} ${q(extraJoin.as)}
    ON ${extraJoin.condition}` : ''}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(order.columns, q, order.table)}
  LIMIT ${limit} OFFSET ${offset}
) ${q(as)} ON ${joinCondition}`;
  }
  return `\
FROM (
  SELECT ${q(as)}.*, count(*) OVER () AS ${q('$total')}
  FROM ${table} ${q(as)}
  WHERE ${whereCondition}
  ORDER BY ${orderColumnsToString(order.columns, q, order.table)}
  LIMIT ${limit} OFFSET ${offset}
) ${q(as)}`;
}

function orderColumnsToString(orderColumns, q, as) {
  const conditions = [];
  for (let column in orderColumns) {
    conditions.push(`${as ? q(as) + '.' : ''}${q(column)} ${orderColumns[column]}`);
  }
  return conditions.join(', ');
}

function interpretForOffsetPaging(node, dialect) {
  var _ref5, _ref6;

  const { name } = dialect;
  if ((_ref6 = node) != null ? (_ref6 = _ref6.args) != null ? _ref6.last : _ref6 : _ref6) {
    throw new Error('Backward pagination not supported with offsets. Consider using keyset pagination instead');
  }

  const order = {};
  if (node.orderBy) {
    order.table = node.as;
    order.columns = node.orderBy;
  } else {
    order.table = node.junction.as;
    order.columns = node.junction.orderBy;
  }

  let limit = ['mariadb', 'mysql', 'oracle'].includes(name) ? '18446744073709551615' : 'ALL';
  let offset = 0;
  if ((_ref5 = node) != null ? (_ref5 = _ref5.args) != null ? _ref5.first : _ref5 : _ref5) {
    limit = parseInt(node.args.first, 10);

    if (node.paginate) {
      limit++;
    }
    if (node.args.after) {
      offset = (0, _graphqlRelay.cursorToOffset)(node.args.after) + 1;
    }
  }
  return { limit, offset, order };
}

function interpretForKeysetPaging(node, dialect) {
  var _ref, _ref2;

  const { name } = dialect;

  let sortTable;
  let sortKey;
  let descending;
  const order = { columns: {} };
  if (node.sortKey) {
    var _ref4;

    sortKey = node.sortKey;
    descending = sortKey.order.toUpperCase() === 'DESC';
    sortTable = node.as;

    if ((_ref4 = node) != null ? (_ref4 = _ref4.args) != null ? _ref4.last : _ref4 : _ref4) {
      descending = !descending;
    }
    for (let column of (0, _util.wrap)(sortKey.key)) {
      order.columns[column] = descending ? 'DESC' : 'ASC';
    }
    order.table = node.as;
  } else {
    var _ref3;

    sortKey = node.junction.sortKey;
    descending = sortKey.order.toUpperCase() === 'DESC';
    sortTable = node.junction.as;

    if ((_ref3 = node) != null ? (_ref3 = _ref3.args) != null ? _ref3.last : _ref3 : _ref3) {
      descending = !descending;
    }
    for (let column of (0, _util.wrap)(sortKey.key)) {
      order.columns[column] = descending ? 'DESC' : 'ASC';
    }
    order.table = node.junction.as;
  }

  let limit = ['mariadb', 'mysql', 'oracle'].includes(name) ? '18446744073709551615' : 'ALL';
  let whereCondition = '';
  if ((_ref2 = node) != null ? (_ref2 = _ref2.args) != null ? _ref2.first : _ref2 : _ref2) {
    limit = parseInt(node.args.first, 10) + 1;
    if (node.args.after) {
      const cursorObj = (0, _util.cursorToObj)(node.args.after);
      validateCursor(cursorObj, (0, _util.wrap)(sortKey.key));
      whereCondition = sortKeyToWhereCondition(cursorObj, descending, sortTable, dialect);
    }
    if (node.args.before) {
      throw new Error('Using "before" with "first" is nonsensical.');
    }
  } else if ((_ref = node) != null ? (_ref = _ref.args) != null ? _ref.last : _ref : _ref) {
    limit = parseInt(node.args.last, 10) + 1;
    if (node.args.before) {
      const cursorObj = (0, _util.cursorToObj)(node.args.before);
      validateCursor(cursorObj, (0, _util.wrap)(sortKey.key));
      whereCondition = sortKeyToWhereCondition(cursorObj, descending, sortTable, dialect);
    }
    if (node.args.after) {
      throw new Error('Using "after" with "last" is nonsensical.');
    }
  }

  return { limit, order, whereCondition };
}

function validateCursor(cursorObj, expectedKeys) {
  const actualKeys = Object.keys(cursorObj);
  const expectedKeySet = new Set(expectedKeys);
  const actualKeySet = new Set(actualKeys);
  for (let key of actualKeys) {
    if (!expectedKeySet.has(key)) {
      throw new Error(`Invalid cursor. The column "${key}" is not in the sort key.`);
    }
  }
  for (let key of expectedKeys) {
    if (!actualKeySet.has(key)) {
      throw new Error(`Invalid cursor. The column "${key}" is not in the cursor.`);
    }
  }
}

function sortKeyToWhereCondition(keyObj, descending, sortTable, dialect) {
  const { name, quote: q } = dialect;
  const sortColumns = [];
  const sortValues = [];
  for (let key in keyObj) {
    sortColumns.push(`${q(sortTable)}.${q(key)}`);
    sortValues.push((0, _util.maybeQuote)(keyObj[key], name));
  }
  const operator = descending ? '<' : '>';
  return name === 'oracle' ? recursiveWhereJoin(sortColumns, sortValues, operator) : `(${sortColumns.join(', ')}) ${operator} (${sortValues.join(', ')})`;
}

function recursiveWhereJoin(columns, values, op) {
  const condition = `${columns.pop()} ${op} ${values.pop()}`;
  return _recursiveWhereJoin(columns, values, op, condition);
}

function _recursiveWhereJoin(columns, values, op, condition) {
  if (!columns.length) {
    return condition;
  }
  const column = columns.pop();
  const value = values.pop();
  condition = `(${column} ${op} ${value} OR (${column} = ${value} AND ${condition}))`;
  return _recursiveWhereJoin(columns, values, op, condition);
}