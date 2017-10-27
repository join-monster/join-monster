'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _shared = require('../shared');

var _lodash = require('lodash');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function recursiveConcat(keys) {
  if (keys.length <= 1) {
    return keys[0];
  }
  return recursiveConcat([`CONCAT(${keys[0]}, ${keys[1]})`, ...keys.slice(2)]);
}

const q = str => `"${str}"`;

function keysetPagingSelect(table, whereCondition, order, limit, as, options = {}) {
  let { joinCondition, joinType, extraJoin } = options;
  whereCondition = (0, _lodash.filter)(whereCondition).join(' AND ') || '1 = 1';
  if (joinCondition) {
    return `\
${joinType === 'LEFT' ? 'OUTER' : 'CROSS'} APPLY (
  SELECT "${as}".*
  FROM ${table} "${as}"
  ${extraJoin ? `LEFT JOIN ${extraJoin.name} ${q(extraJoin.as)}
    ON ${extraJoin.condition}` : ''}
  WHERE ${whereCondition}
  ORDER BY ${(0, _shared.orderColumnsToString)(order.columns, q, order.table)}
  FETCH FIRST ${limit} ROWS ONLY
) ${q(as)}`;
  }
  return `\
FROM (
  SELECT "${as}".*
  FROM ${table} "${as}"
  WHERE ${whereCondition}
  ORDER BY ${(0, _shared.orderColumnsToString)(order.columns, q, order.table)}
  FETCH FIRST ${limit} ROWS ONLY
) ${q(as)}`;
}

function offsetPagingSelect(table, pagingWhereConditions, order, limit, offset, as, options = {}) {
  let { joinCondition, joinType, extraJoin } = options;
  const whereCondition = (0, _lodash.filter)(pagingWhereConditions).join(' AND ') || '1 = 1';
  if (joinCondition) {
    return `\
${joinType === 'LEFT' ? 'OUTER' : 'CROSS'} APPLY (
  SELECT "${as}".*, count(*) OVER () AS ${q('$total')}
  FROM ${table} "${as}"
  ${extraJoin ? `LEFT JOIN ${extraJoin.name} ${q(extraJoin.as)}
    ON ${extraJoin.condition}` : ''}
  WHERE ${whereCondition}
  ORDER BY ${(0, _shared.orderColumnsToString)(order.columns, q, order.table)}
  OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
) ${q(as)}`;
  }
  return `\
FROM (
  SELECT "${as}".*, count(*) OVER () AS ${q('$total')}
  FROM ${table} "${as}"
  WHERE ${whereCondition}
  ORDER BY ${(0, _shared.orderColumnsToString)(order.columns, q, order.table)}
  OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
) ${q(as)}`;
}

const dialect = module.exports = _extends({}, require('./pg'), {
  name: 'oracle',

  compositeKey(parent, keys) {
    keys = keys.map(key => `"${parent}"."${key}"`);
    return `NULLIF(${recursiveConcat(keys)}, '')`;
  },

  handlePaginationAtRoot: (() => {
    var _ref = _asyncToGenerator(function* (parent, node, context, tables) {
      const pagingWhereConditions = [];
      if (node.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        if (node.where) {
          pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
        }
        tables.push(keysetPagingSelect(node.name, pagingWhereConditions, order, limit, node.as));
      } else if (node.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        if (node.where) {
          pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
        }
        tables.push(offsetPagingSelect(node.name, pagingWhereConditions, order, limit, offset, node.as));
      }
    });

    return function handlePaginationAtRoot(_x, _x2, _x3, _x4) {
      return _ref.apply(this, arguments);
    };
  })(),

  handleJoinedOneToManyPaginated: (() => {
    var _ref2 = _asyncToGenerator(function* (parent, node, context, tables, joinCondition) {
      const pagingWhereConditions = [yield node.sqlJoin(`"${parent.as}"`, q(node.as), node.args || {}, context, node)];
      if (node.where) {
        pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
      }

      if (node.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        tables.push(keysetPagingSelect(node.name, pagingWhereConditions, order, limit, node.as, {
          joinCondition, joinType: 'LEFT'
        }));
      } else if (node.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        tables.push(offsetPagingSelect(node.name, pagingWhereConditions, order, limit, offset, node.as, {
          joinCondition, joinType: 'LEFT'
        }));
      }
    });

    return function handleJoinedOneToManyPaginated(_x5, _x6, _x7, _x8, _x9) {
      return _ref2.apply(this, arguments);
    };
  })(),

  handleJoinedManyToManyPaginated: (() => {
    var _ref3 = _asyncToGenerator(function* (parent, node, context, tables, joinCondition1, joinCondition2) {
      const pagingWhereConditions = [yield node.junction.sqlJoins[0](`"${parent.as}"`, `"${node.junction.as}"`, node.args || {}, context, node)];
      if (node.junction.where) {
        pagingWhereConditions.push((yield node.junction.where(`"${node.junction.as}"`, node.args || {}, context, node)));
      }
      if (node.where) {
        pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
      }

      const lateralJoinOptions = { joinCondition: joinCondition1, joinType: 'LEFT' };
      if (node.where || node.orderBy) {
        lateralJoinOptions.extraJoin = {
          name: node.name,
          as: node.as,
          condition: joinCondition2
        };
      }
      if (node.sortKey || node.junction.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        tables.push(keysetPagingSelect(node.junction.sqlTable, pagingWhereConditions, order, limit, node.junction.as, lateralJoinOptions));
      } else if (node.orderBy || node.junction.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        tables.push(offsetPagingSelect(node.junction.sqlTable, pagingWhereConditions, order, limit, offset, node.junction.as, lateralJoinOptions));
      }
    });

    return function handleJoinedManyToManyPaginated(_x10, _x11, _x12, _x13, _x14, _x15) {
      return _ref3.apply(this, arguments);
    };
  })(),

  handleBatchedOneToManyPaginated: (() => {
    var _ref4 = _asyncToGenerator(function* (parent, node, context, tables, batchScope) {
      const pagingWhereConditions = [`"${node.as}"."${node.sqlBatch.thisKey.name}" = "temp"."value"`];
      if (node.where) {
        pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
      }
      tables.push(`FROM (${arrToTableUnion(batchScope)}) "temp"`);
      const lateralJoinCondition = `"${node.as}"."${node.sqlBatch.thisKey.name}" = "temp"."value"`;
      if (node.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        tables.push(keysetPagingSelect(node.name, pagingWhereConditions, order, limit, node.as, { joinCondition: lateralJoinCondition }));
      } else if (node.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        tables.push(offsetPagingSelect(node.name, pagingWhereConditions, order, limit, offset, node.as, {
          joinCondition: lateralJoinCondition
        }));
      }
    });

    return function handleBatchedOneToManyPaginated(_x16, _x17, _x18, _x19, _x20) {
      return _ref4.apply(this, arguments);
    };
  })(),

  handleBatchedManyToManyPaginated: (() => {
    var _ref5 = _asyncToGenerator(function* (parent, node, context, tables, batchScope, joinCondition) {
      const pagingWhereConditions = [`"${node.junction.as}"."${node.junction.sqlBatch.thisKey.name}" = "temp"."value"`];
      if (node.junction.where) {
        pagingWhereConditions.push((yield node.junction.where(`"${node.junction.as}"`, node.args || {}, context, node)));
      }
      if (node.where) {
        pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
      }

      tables.push(`FROM (${arrToTableUnion(batchScope)}) "temp"`);
      const lateralJoinCondition = `"${node.junction.as}"."${node.junction.sqlBatch.thisKey.name}" = "temp"."value"`;

      const lateralJoinOptions = { joinCondition: lateralJoinCondition, joinType: 'LEFT' };
      if (node.where || node.orderBy) {
        lateralJoinOptions.extraJoin = {
          name: node.name,
          as: node.as,
          condition: joinCondition
        };
      }
      if (node.sortKey || node.junction.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        tables.push(keysetPagingSelect(node.junction.sqlTable, pagingWhereConditions, order, limit, node.junction.as, lateralJoinOptions));
      } else if (node.orderBy || node.junction.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        tables.push(offsetPagingSelect(node.junction.sqlTable, pagingWhereConditions, order, limit, offset, node.junction.as, lateralJoinOptions));
      }
      tables.push(`LEFT JOIN ${node.name} "${node.as}" ON ${joinCondition}`);
    });

    return function handleBatchedManyToManyPaginated(_x21, _x22, _x23, _x24, _x25, _x26) {
      return _ref5.apply(this, arguments);
    };
  })()
});

function arrToTableUnion(arr) {
  return arr.map(val => `
  SELECT ${val} AS "value" FROM DUAL
`).join(' UNION ');
}