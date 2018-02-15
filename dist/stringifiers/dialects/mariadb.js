'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _shared = require('../shared');

var _lodash = require('lodash');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function quote(str) {
  return `\`${str}\``;
}

function joinUnions(unions, as) {
  return `FROM (
${unions.join('\nUNION\n')}
) AS ${quote(as)}`;
}

function paginatedSelect(table, as, whereConditions, order, limit, offset, opts = {}) {
  const { extraJoin, withTotal } = opts;
  as = quote(as);
  return `\
  (SELECT ${as}.*${withTotal ? ', count(*) OVER () AS `$total`' : ''}
  FROM ${table} ${as}
  ${extraJoin ? `LEFT JOIN ${extraJoin.name} ${quote(extraJoin.as)}
    ON ${extraJoin.condition}` : ''}
  WHERE ${whereConditions}
  ORDER BY ${(0, _shared.orderColumnsToString)(order.columns, quote, order.table)}
  LIMIT ${limit}${offset ? ' OFFSET ' + offset : ''})`;
}

const dialect = module.exports = _extends({}, require('./mixins/pagination-not-supported'), {

  name: 'mariadb',

  quote,

  compositeKey(parent, keys) {
    keys = keys.map(key => `${quote(parent)}.${quote(key)}`);
    return `CONCAT(${keys.join(', ')})`;
  },

  handlePaginationAtRoot: (() => {
    var _ref = _asyncToGenerator(function* (parent, node, context, tables) {
      const pagingWhereConditions = [];
      if (node.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        if (node.where) {
          pagingWhereConditions.push((yield node.where(`${quote(node.as)}`, node.args || {}, context, node)));
        }
        tables.push((0, _shared.keysetPagingSelect)(node.name, pagingWhereConditions, order, limit, node.as, { q: quote }));
      } else if (node.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        if (node.where) {
          pagingWhereConditions.push((yield node.where(`${quote(node.as)}`, node.args || {}, context, node)));
        }
        tables.push((0, _shared.offsetPagingSelect)(node.name, pagingWhereConditions, order, limit, offset, node.as, { q: quote }));
      }
    });

    return function handlePaginationAtRoot(_x, _x2, _x3, _x4) {
      return _ref.apply(this, arguments);
    };
  })(),

  handleBatchedOneToManyPaginated: (() => {
    var _ref2 = _asyncToGenerator(function* (parent, node, context, tables, batchScope) {
      const pagingWhereConditions = [];
      if (node.where) {
        pagingWhereConditions.push((yield node.where(`${quote(node.as)}`, node.args || {}, context, node)));
      }
      if (node.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        const unions = batchScope.map(function (val) {
          let whereConditions = [...pagingWhereConditions, `${quote(node.as)}.${quote(node.sqlBatch.thisKey.name)} = ${val}`];
          whereConditions = (0, _lodash.filter)(whereConditions).join(' AND ') || '1';
          return paginatedSelect(node.name, node.as, whereConditions, order, limit, null);
        });
        tables.push(joinUnions(unions, node.as));
      } else if (node.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        const unions = batchScope.map(function (val) {
          let whereConditions = [...pagingWhereConditions, `${quote(node.as)}.${quote(node.sqlBatch.thisKey.name)} = ${val}`];
          whereConditions = (0, _lodash.filter)(whereConditions).join(' AND ') || '1';
          return paginatedSelect(node.name, node.as, whereConditions, order, limit, offset, { withTotal: true });
        });
        tables.push(joinUnions(unions, node.as));
      }
    });

    return function handleBatchedOneToManyPaginated(_x5, _x6, _x7, _x8, _x9) {
      return _ref2.apply(this, arguments);
    };
  })(),

  handleBatchedManyToManyPaginated: (() => {
    var _ref3 = _asyncToGenerator(function* (parent, node, context, tables, batchScope, joinCondition) {
      const pagingWhereConditions = [];
      if (node.junction.where) {
        pagingWhereConditions.push((yield node.junction.where(`${quote(node.junction.as)}`, node.args || {}, context, node)));
      }
      if (node.where) {
        pagingWhereConditions.push((yield node.where(`${quote(node.as)}`, node.args || {}, context, node)));
      }

      if (node.where || node.orderBy) {
        var extraJoin = {
          name: node.name,
          as: node.as,
          condition: joinCondition
        };
      }
      if (node.sortKey || node.junction.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        const unions = batchScope.map(function (val) {
          let whereConditions = [...pagingWhereConditions, `${quote(node.junction.as)}.${quote(node.junction.sqlBatch.thisKey.name)} = ${val}`];
          whereConditions = (0, _lodash.filter)(whereConditions).join(' AND ') || '1';
          return paginatedSelect(node.junction.sqlTable, node.junction.as, whereConditions, order, limit, null, { extraJoin });
        });
        tables.push(joinUnions(unions, node.junction.as));
      } else if (node.orderBy || node.junction.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        const unions = batchScope.map(function (val) {
          let whereConditions = [...pagingWhereConditions, `${quote(node.junction.as)}.${quote(node.junction.sqlBatch.thisKey.name)} = ${val}`];
          whereConditions = (0, _lodash.filter)(whereConditions).join(' AND ') || '1';
          return paginatedSelect(node.junction.sqlTable, node.junction.as, whereConditions, order, limit, offset, {
            withTotal: true,
            extraJoin
          });
        });
        tables.push(joinUnions(unions, node.junction.as));
      }
      tables.push(`LEFT JOIN ${node.name} AS ${quote(node.as)} ON ${joinCondition}`);
    });

    return function handleBatchedManyToManyPaginated(_x10, _x11, _x12, _x13, _x14, _x15) {
      return _ref3.apply(this, arguments);
    };
  })()
});