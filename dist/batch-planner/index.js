'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

let nextBatch = (() => {
  var _ref3 = _asyncToGenerator(function* (sqlAST, data, dbCall, context, options) {
    if (sqlAST.paginate) {
      if (Array.isArray(data)) {
        data = (0, _lodash.chain)(data).flatMap('edges').map('node').value();
      } else {
        data = (0, _lodash.map)(data.edges, 'node');
      }
    }
    if (!data || Array.isArray(data) && data.length === 0) {
      return;
    }

    const children = sqlAST.children;
    Object.keys(sqlAST.typedChildren || {}).map(key => (sqlAST.typedChildren || {})[key]).forEach(function (typedChildren) {
      return children.push(...typedChildren);
    });

    return Promise.all(children.map(function (childAST) {
      return nextBatchChild(childAST, data, dbCall, context, options);
    }));
  });

  return function nextBatch(_x, _x2, _x3, _x4, _x5) {
    return _ref3.apply(this, arguments);
  };
})();

let nextBatchChild = (() => {
  var _ref4 = _asyncToGenerator(function* (childAST, data, dbCall, context, options) {
    var _ref2;

    if (childAST.type !== 'table' && childAST.type !== 'union') return;

    const fieldName = childAST.fieldName;

    if (childAST.sqlBatch || ((_ref2 = childAST) != null ? (_ref2 = _ref2.junction) != null ? _ref2.sqlBatch : _ref2 : _ref2)) {
      var _ref;

      let thisKey;
      let parentKey;
      if (childAST.sqlBatch) {
        childAST.children.push(childAST.sqlBatch.thisKey);
        thisKey = childAST.sqlBatch.thisKey.fieldName;
        parentKey = childAST.sqlBatch.parentKey.fieldName;
      } else if ((_ref = childAST) != null ? (_ref = _ref.junction) != null ? _ref.sqlBatch : _ref : _ref) {
        childAST.children.push(childAST.junction.sqlBatch.thisKey);
        thisKey = childAST.junction.sqlBatch.thisKey.fieldName;
        parentKey = childAST.junction.sqlBatch.parentKey.fieldName;
      }

      if (Array.isArray(data)) {
        const batchScope = (0, _lodash.uniq)(data.map(function (obj) {
          return (0, _util.maybeQuote)(obj[parentKey]);
        }));

        const { sql, shapeDefinition } = yield (0, _util.compileSqlAST)(childAST, context, _extends({}, options, { batchScope }));

        let newData = yield (0, _util.handleUserDbCall)(dbCall, sql, childAST, (0, _util.wrap)(shapeDefinition));

        newData = (0, _lodash.groupBy)(newData, thisKey);

        if (childAST.paginate) {
          (0, _lodash.forIn)(newData, function (group, key, obj) {
            obj[key] = (0, _arrayToConnection2.default)(group, childAST);
          });
        }

        if (childAST.grabMany) {
          for (let obj of data) {
            obj[fieldName] = newData[obj[parentKey]] || (childAST.paginate ? { total: 0, edges: [] } : []);
          }
        } else {
          let matchedData = [];
          for (let obj of data) {
            const ob = newData[obj[parentKey]];
            if (ob) {
              obj[fieldName] = (0, _arrayToConnection2.default)(newData[obj[parentKey]][0], childAST);
              matchedData.push(obj);
            } else {
              obj[fieldName] = null;
            }
          }
          data = matchedData;
        }

        const nextLevelData = (0, _lodash.chain)(data).filter(function (obj) {
          return obj != null;
        }).flatMap(function (obj) {
          return obj[fieldName];
        }).filter(function (obj) {
          return obj != null;
        }).value();
        return nextBatch(childAST, nextLevelData, dbCall, context, options);
      }
      const batchScope = [(0, _util.maybeQuote)(data[parentKey])];
      const { sql, shapeDefinition } = yield (0, _util.compileSqlAST)(childAST, context, _extends({}, options, { batchScope }));
      let newData = yield (0, _util.handleUserDbCall)(dbCall, sql, childAST, (0, _util.wrap)(shapeDefinition));
      newData = (0, _lodash.groupBy)(newData, thisKey);
      if (childAST.paginate) {
        const targets = newData[data[parentKey]];
        data[fieldName] = (0, _arrayToConnection2.default)(targets, childAST);
      } else if (childAST.grabMany) {
        data[fieldName] = newData[data[parentKey]] || [];
      } else {
        const targets = newData[data[parentKey]] || [];
        data[fieldName] = targets[0];
      }
      if (data) {
        return nextBatch(childAST, data[fieldName], dbCall, context, options);
      }
    } else if (Array.isArray(data)) {
      const nextLevelData = (0, _lodash.chain)(data).filter(function (obj) {
        return obj != null;
      }).flatMap(function (obj) {
        return obj[fieldName];
      }).filter(function (obj) {
        return obj != null;
      }).value();
      return nextBatch(childAST, nextLevelData, dbCall, context, options);
    } else if (data) {
      return nextBatch(childAST, data[fieldName], dbCall, context, options);
    }
  });

  return function nextBatchChild(_x6, _x7, _x8, _x9, _x10) {
    return _ref4.apply(this, arguments);
  };
})();

var _lodash = require('lodash');

var _arrayToConnection = require('../array-to-connection');

var _arrayToConnection2 = _interopRequireDefault(_arrayToConnection);

var _util = require('../util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = nextBatch;