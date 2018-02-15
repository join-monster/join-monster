'use strict';

var _shared = require('../shared');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const dialect = module.exports = {
  name: 'pg',

  quote(str) {
    return `"${str}"`;
  },

  compositeKey(parent, keys) {
    keys = keys.map(key => `"${parent}"."${key}"`);
    return `NULLIF(CONCAT(${keys.join(', ')}), '')`;
  },

  handleJoinedOneToManyPaginated: (() => {
    var _ref = _asyncToGenerator(function* (parent, node, context, tables, joinCondition) {
      const pagingWhereConditions = [yield node.sqlJoin(`"${parent.as}"`, `"${node.as}"`, node.args || {}, context, node)];
      if (node.where) {
        pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
      }

      if (node.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        tables.push((0, _shared.keysetPagingSelect)(node.name, pagingWhereConditions, order, limit, node.as, { joinCondition, joinType: 'LEFT' }));
      } else if (node.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        tables.push((0, _shared.offsetPagingSelect)(node.name, pagingWhereConditions, order, limit, offset, node.as, {
          joinCondition, joinType: 'LEFT'
        }));
      }
    });

    return function handleJoinedOneToManyPaginated(_x, _x2, _x3, _x4, _x5) {
      return _ref.apply(this, arguments);
    };
  })(),

  handleBatchedManyToManyPaginated: (() => {
    var _ref2 = _asyncToGenerator(function* (parent, node, context, tables, batchScope, joinCondition) {
      const pagingWhereConditions = [`"${node.junction.as}"."${node.junction.sqlBatch.thisKey.name}" = temp."${node.junction.sqlBatch.parentKey.name}"`];
      if (node.junction.where) {
        pagingWhereConditions.push((yield node.junction.where(`"${node.junction.as}"`, node.args || {}, context, node)));
      }
      if (node.where) {
        pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
      }

      const tempTable = `FROM (VALUES ${batchScope.map(function (val) {
        return `(${val})`;
      })}) temp("${node.junction.sqlBatch.parentKey.name}")`;
      tables.push(tempTable);
      const lateralJoinCondition = `"${node.junction.as}"."${node.junction.sqlBatch.thisKey.name}" = temp."${node.junction.sqlBatch.parentKey.name}"`;

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
        tables.push((0, _shared.keysetPagingSelect)(node.junction.sqlTable, pagingWhereConditions, order, limit, node.junction.as, lateralJoinOptions));
      } else if (node.orderBy || node.junction.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        tables.push((0, _shared.offsetPagingSelect)(node.junction.sqlTable, pagingWhereConditions, order, limit, offset, node.junction.as, lateralJoinOptions));
      }
      tables.push(`LEFT JOIN ${node.name} AS "${node.as}" ON ${joinCondition}`);
    });

    return function handleBatchedManyToManyPaginated(_x6, _x7, _x8, _x9, _x10, _x11) {
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
        tables.push((0, _shared.keysetPagingSelect)(node.junction.sqlTable, pagingWhereConditions, order, limit, node.junction.as, lateralJoinOptions));
      } else if (node.orderBy || node.junction.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        tables.push((0, _shared.offsetPagingSelect)(node.junction.sqlTable, pagingWhereConditions, order, limit, offset, node.junction.as, lateralJoinOptions));
      }
    });

    return function handleJoinedManyToManyPaginated(_x12, _x13, _x14, _x15, _x16, _x17) {
      return _ref3.apply(this, arguments);
    };
  })(),

  handlePaginationAtRoot: (() => {
    var _ref4 = _asyncToGenerator(function* (parent, node, context, tables) {
      const pagingWhereConditions = [];
      if (node.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        if (node.where) {
          pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
        }
        tables.push((0, _shared.keysetPagingSelect)(node.name, pagingWhereConditions, order, limit, node.as));
      } else if (node.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        if (node.where) {
          pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
        }
        tables.push((0, _shared.offsetPagingSelect)(node.name, pagingWhereConditions, order, limit, offset, node.as));
      }
    });

    return function handlePaginationAtRoot(_x18, _x19, _x20, _x21) {
      return _ref4.apply(this, arguments);
    };
  })(),

  handleBatchedOneToManyPaginated: (() => {
    var _ref5 = _asyncToGenerator(function* (parent, node, context, tables, batchScope) {
      const pagingWhereConditions = [`"${node.as}"."${node.sqlBatch.thisKey.name}" = temp."${node.sqlBatch.parentKey.name}"`];
      if (node.where) {
        pagingWhereConditions.push((yield node.where(`"${node.as}"`, node.args || {}, context, node)));
      }
      const tempTable = `FROM (VALUES ${batchScope.map(function (val) {
        return `(${val})`;
      })}) temp("${node.sqlBatch.parentKey.name}")`;
      tables.push(tempTable);
      const lateralJoinCondition = `"${node.as}"."${node.sqlBatch.thisKey.name}" = temp."${node.sqlBatch.parentKey.name}"`;
      if (node.sortKey) {
        const { limit, order, whereCondition: whereAddendum } = (0, _shared.interpretForKeysetPaging)(node, dialect);
        pagingWhereConditions.push(whereAddendum);
        tables.push((0, _shared.keysetPagingSelect)(node.name, pagingWhereConditions, order, limit, node.as, { joinCondition: lateralJoinCondition }));
      } else if (node.orderBy) {
        const { limit, offset, order } = (0, _shared.interpretForOffsetPaging)(node, dialect);
        tables.push((0, _shared.offsetPagingSelect)(node.name, pagingWhereConditions, order, limit, offset, node.as, {
          joinCondition: lateralJoinCondition
        }));
      }
    });

    return function handleBatchedOneToManyPaginated(_x22, _x23, _x24, _x25, _x26) {
      return _ref5.apply(this, arguments);
    };
  })()

};