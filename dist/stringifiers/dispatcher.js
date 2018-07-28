'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

let _stringifySqlAST = (() => {
  var _ref7 = _asyncToGenerator(function* (parent, node, prefix, context, selections, tables, wheres, orders, batchScope, dialect) {
    const { quote: q } = dialect;
    const parentTable = node.fromOtherTable || parent && parent.as;
    switch (node.type) {
      case 'table':
        yield handleTable(parent, node, prefix, context, selections, tables, wheres, orders, batchScope, dialect);

        if ((0, _shared.thisIsNotTheEndOfThisBatch)(node, parent)) {
          for (let child of node.children) {
            yield _stringifySqlAST(node, child, [...prefix, node.as], context, selections, tables, wheres, orders, null, dialect);
          }
        }

        break;
      case 'union':
        yield handleTable(parent, node, prefix, context, selections, tables, wheres, orders, batchScope, dialect);

        if ((0, _shared.thisIsNotTheEndOfThisBatch)(node, parent)) {
          for (let typeName in node.typedChildren) {
            for (let child of node.typedChildren[typeName]) {
              yield _stringifySqlAST(node, child, [...prefix, node.as], context, selections, tables, wheres, orders, null, dialect);
            }
          }
          for (let child of node.children) {
            yield _stringifySqlAST(node, child, [...prefix, node.as], context, selections, tables, wheres, orders, null, dialect);
          }
        }

        break;
      case 'column':
        selections.push(`${q(parentTable)}.${q(node.name)} AS ${q((0, _shared.joinPrefix)(prefix) + node.as)}`);
        break;
      case 'columnDeps':
        for (let name in node.names) {
          selections.push(`${q(parentTable)}.${q(name)} AS ${q((0, _shared.joinPrefix)(prefix) + node.names[name])}`);
        }
        break;
      case 'composite':
        selections.push(`${dialect.compositeKey(parentTable, node.name)} AS ${q((0, _shared.joinPrefix)(prefix) + node.as)}`);
        break;
      case 'expression':
        const expr = yield node.sqlExpr(`${q(parentTable)}`, node.args || {}, context, node);
        selections.push(`${expr} AS ${q((0, _shared.joinPrefix)(prefix) + node.as)}`);
        break;
      case 'foreign_column':
        const table = yield node.sqlForeignTable(`${q(parent.as)}`, node.args || {}, context, node);
        selections.push(`${q(node.as)}.${q(node.name)} AS ${q((0, _shared.joinPrefix)(prefix) + node.as)}`);
        tables.push(`LEFT JOIN LATERAL ${table} ${q(node.as)} ON TRUE`);
        break;
      case 'noop':
        return;
      default:
        throw new Error('unexpected/unknown node type reached: ' + (0, _util.inspect)(node));
    }
    return { selections, tables, wheres, orders };
  });

  return function _stringifySqlAST(_x4, _x5, _x6, _x7, _x8, _x9, _x10, _x11, _x12, _x13) {
    return _ref7.apply(this, arguments);
  };
})();

let handleTable = (() => {
  var _ref8 = _asyncToGenerator(function* (parent, node, prefix, context, selections, tables, wheres, orders, batchScope, dialect) {
    var _ref, _ref2;

    const { quote: q } = dialect;

    if ((0, _shared.whereConditionIsntSupposedToGoInsideSubqueryOrOnNextBatch)(node, parent)) {
      var _ref5;

      if ((_ref5 = node) != null ? (_ref5 = _ref5.junction) != null ? _ref5.where : _ref5 : _ref5) {
        wheres.push((yield node.junction.where(`${q(node.junction.as)}`, node.args || {}, context, node)));
      }
      if (node.where) {
        wheres.push((yield node.where(`${q(node.as)}`, node.args || {}, context, node)));
      }
    }

    if ((0, _shared.thisIsNotTheEndOfThisBatch)(node, parent)) {
      var _ref3, _ref4;

      if ((_ref4 = node) != null ? (_ref4 = _ref4.junction) != null ? _ref4.orderBy : _ref4 : _ref4) {
        orders.push({
          table: node.junction.as,
          columns: node.junction.orderBy
        });
      }
      if (node.orderBy) {
        orders.push({
          table: node.as,
          columns: node.orderBy
        });
      }
      if ((_ref3 = node) != null ? (_ref3 = _ref3.junction) != null ? _ref3.sortKey : _ref3 : _ref3) {
        orders.push({
          table: node.junction.as,
          columns: sortKeyToOrderColumns(node.junction.sortKey, node.args)
        });
      }
      if (node.sortKey) {
        orders.push({
          table: node.as,
          columns: sortKeyToOrderColumns(node.sortKey, node.args)
        });
      }
    }

    if (node.sqlJoin) {
      const joinCondition = yield node.sqlJoin(`${q(parent.as)}`, q(node.as), node.args || {}, context, node);

      if (node.paginate) {
        yield dialect.handleJoinedOneToManyPaginated(parent, node, context, tables, joinCondition);
      } else if (node.limit) {
        node.args.first = node.limit;
        yield dialect.handleJoinedOneToManyPaginated(parent, node, context, tables, joinCondition);
      } else {
        tables.push(`LEFT JOIN ${node.name} ${q(node.as)} ON ${joinCondition}`);
      }
    } else if ((_ref2 = node) != null ? (_ref2 = _ref2.junction) != null ? _ref2.sqlBatch : _ref2 : _ref2) {
      if (parent) {
        selections.push(`${q(parent.as)}.${q(node.junction.sqlBatch.parentKey.name)} AS ${q((0, _shared.joinPrefix)(prefix) + node.junction.sqlBatch.parentKey.as)}`);
      } else {
        const joinCondition = yield node.junction.sqlBatch.sqlJoin(`${q(node.junction.as)}`, q(node.as), node.args || {}, context, node);
        if (node.paginate) {
          yield dialect.handleBatchedManyToManyPaginated(parent, node, context, tables, batchScope, joinCondition);
        } else if (node.limit) {
          node.args.first = node.limit;
          yield dialect.handleBatchedManyToManyPaginated(parent, node, context, tables, batchScope, joinCondition);
        } else {
          tables.push(`FROM ${node.junction.sqlTable} ${q(node.junction.as)}`, `LEFT JOIN ${node.name} ${q(node.as)} ON ${joinCondition}`);

          wheres.push(`${q(node.junction.as)}.${q(node.junction.sqlBatch.thisKey.name)} IN (${batchScope.join(',')})`);
        }
      }
    } else if ((_ref = node) != null ? (_ref = _ref.junction) != null ? _ref.sqlTable : _ref : _ref) {
      const joinCondition1 = yield node.junction.sqlJoins[0](`${q(parent.as)}`, q(node.junction.as), node.args || {}, context, node);
      const joinCondition2 = yield node.junction.sqlJoins[1](`${q(node.junction.as)}`, q(node.as), node.args || {}, context, node);

      if (node.paginate) {
        yield dialect.handleJoinedManyToManyPaginated(parent, node, context, tables, joinCondition1, joinCondition2);
      } else if (node.limit) {
        node.args.first = node.limit;
        yield dialect.handleJoinedManyToManyPaginated(parent, node, context, tables, joinCondition1, joinCondition2);
      } else {
        tables.push(`LEFT JOIN ${node.junction.sqlTable} ${q(node.junction.as)} ON ${joinCondition1}`);
      }
      tables.push(`LEFT JOIN ${node.name} ${q(node.as)} ON ${joinCondition2}`);
    } else if (node.sqlBatch) {
      if (parent) {
        selections.push(`${q(parent.as)}.${q(node.sqlBatch.parentKey.name)} AS ${q((0, _shared.joinPrefix)(prefix) + node.sqlBatch.parentKey.as)}`);
      } else if (node.paginate) {
        yield dialect.handleBatchedOneToManyPaginated(parent, node, context, tables, batchScope);
      } else if (node.limit) {
        node.args.first = node.limit;
        yield dialect.handleBatchedOneToManyPaginated(parent, node, context, tables, batchScope);
      } else {
        tables.push(`FROM ${node.name} ${q(node.as)}`);
        wheres.push(`${q(node.as)}.${q(node.sqlBatch.thisKey.name)} IN (${batchScope.join(',')})`);
      }
    } else if (node.paginate) {
      yield dialect.handlePaginationAtRoot(parent, node, context, tables);
    } else if (node.limit) {
      node.args.first = node.limit;
      yield dialect.handlePaginationAtRoot(parent, node, context, tables);
    } else {
      (0, _assert2.default)(!parent, `Object type for "${node.fieldName}" table must have a "sqlJoin" or "sqlBatch"`);
      tables.push(`FROM ${node.name} ${q(node.as)}`);
    }
  });

  return function handleTable(_x14, _x15, _x16, _x17, _x18, _x19, _x20, _x21, _x22, _x23) {
    return _ref8.apply(this, arguments);
  };
})();

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _lodash = require('lodash');

var _util = require('../util');

var _shared = require('./shared');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref6 = _asyncToGenerator(function* (topNode, context, options) {
    (0, _util.validateSqlAST)(topNode);

    let dialect = options.dialectModule;

    if (!dialect && options.dialect) {
      dialect = require('./dialects/' + options.dialect);
    }

    let { selections, tables, wheres, orders } = yield _stringifySqlAST(null, topNode, [], context, [], [], [], [], options.batchScope, dialect);

    selections = [...new Set(selections)];

    if (!selections.length) return '';

    let sql = 'SELECT\n  ' + selections.join(',\n  ') + '\n' + tables.join('\n');

    wheres = (0, _lodash.filter)(wheres);
    if (wheres.length) {
      sql += '\nWHERE ' + wheres.join(' AND ');
    }

    if (orders.length) {
      sql += '\nORDER BY ' + stringifyOuterOrder(orders, dialect.quote);
    }

    return sql;
  });

  function stringifySqlAST(_x, _x2, _x3) {
    return _ref6.apply(this, arguments);
  }

  return stringifySqlAST;
})();

function stringifyOuterOrder(orders, q) {
  const conditions = [];
  for (let condition of orders) {
    for (let column in condition.columns) {
      const direction = condition.columns[column];
      conditions.push(`${q(condition.table)}.${q(column)} ${direction}`);
    }
  }
  return conditions.join(', ');
}

function sortKeyToOrderColumns(sortKey, args) {
  let descending = sortKey.order.toUpperCase() === 'DESC';
  if (args && args.last) {
    descending = !descending;
  }
  const orderColumns = {};
  for (let column of (0, _util.wrap)(sortKey.key)) {
    orderColumns[column] = descending ? 'DESC' : 'ASC';
  }
  return orderColumns;
}