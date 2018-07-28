'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

let joinMonster = (() => {
  var _ref = _asyncToGenerator(function* (resolveInfo, context, dbCall, options = {}) {
    const sqlAST = queryAST.queryASTToSqlAST(resolveInfo, options, context);
    const { sql, shapeDefinition } = yield (0, _util.compileSqlAST)(sqlAST, context, options);
    if (!sql) return {};

    let data = yield (0, _util.handleUserDbCall)(dbCall, sql, sqlAST, shapeDefinition);

    data = (0, _arrayToConnection2.default)(data, sqlAST);

    yield (0, _batchPlanner2.default)(sqlAST, data, dbCall, context, options);

    if (Array.isArray(data)) {
      const childrenToCheck = sqlAST.children.filter(function (child) {
        return child.sqlBatch;
      });
      return data.filter(function (d) {
        for (const child of childrenToCheck) {
          if (d[child.fieldName] == null) {
            return false;
          }
        }
        return true;
      });
    }

    return data;
  });

  return function joinMonster(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
})();

let getNode = (() => {
  var _ref2 = _asyncToGenerator(function* (typeName, resolveInfo, context, condition, dbCall, options = {}) {
    const type = resolveInfo.schema._typeMap[typeName];
    (0, _assert2.default)(type, `Type "${typeName}" not found in your schema.`);
    (0, _assert2.default)(type._typeConfig.sqlTable, `joinMonster can't fetch a ${typeName} as a Node unless it has "sqlTable" tagged.`);

    let where = (0, _util.buildWhereFunction)(type, condition, options);

    const fakeParentNode = {
      _fields: {
        node: {
          type,
          name: type.name.toLowerCase(),
          where
        }
      }
    };
    const namespace = new _aliasNamespace2.default(options.minify);
    const sqlAST = {};
    const fieldNodes = resolveInfo.fieldNodes || resolveInfo.fieldASTs;

    queryAST.populateASTNode.call(resolveInfo, fieldNodes[0], fakeParentNode, sqlAST, namespace, 0, options, context);
    queryAST.pruneDuplicateSqlDeps(sqlAST, namespace);
    const { sql, shapeDefinition } = yield (0, _util.compileSqlAST)(sqlAST, context, options);
    const data = (0, _arrayToConnection2.default)((yield (0, _util.handleUserDbCall)(dbCall, sql, sqlAST, shapeDefinition)), sqlAST);
    yield (0, _batchPlanner2.default)(sqlAST, data, dbCall, context, options);
    if (!data) return data;
    data.__type__ = type;
    return data;
  });

  return function getNode(_x4, _x5, _x6, _x7, _x8) {
    return _ref2.apply(this, arguments);
  };
})();

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _queryAstToSqlAst = require('./query-ast-to-sql-ast');

var queryAST = _interopRequireWildcard(_queryAstToSqlAst);

var _arrayToConnection = require('./array-to-connection');

var _arrayToConnection2 = _interopRequireDefault(_arrayToConnection);

var _aliasNamespace = require('./alias-namespace');

var _aliasNamespace2 = _interopRequireDefault(_aliasNamespace);

var _batchPlanner = require('./batch-planner');

var _batchPlanner2 = _interopRequireDefault(_batchPlanner);

var _util = require('./util');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

joinMonster.getNode = getNode;

joinMonster.version = require('../package.json').version;
exports.default = joinMonster;