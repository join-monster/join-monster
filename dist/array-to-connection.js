'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _graphqlRelay = require('graphql-relay');

var _util = require('./util');

function arrToConnection(data, sqlAST) {
  for (let astChild of sqlAST.children || []) {
    if (Array.isArray(data)) {
      for (let dataItem of data) {
        recurseOnObjInData(dataItem, astChild);
      }
    } else if (data) {
      recurseOnObjInData(data, astChild);
    }
  }
  const pageInfo = {
    hasNextPage: false,
    hasPreviousPage: false
  };
  if (!data) {
    if (sqlAST.paginate) {
      return {
        pageInfo,
        edges: []
      };
    }
    return null;
  }

  if (sqlAST.paginate && !data._paginated) {
    var _ref3;

    if (sqlAST.sortKey || ((_ref3 = sqlAST) != null ? (_ref3 = _ref3.junction) != null ? _ref3.sortKey : _ref3 : _ref3)) {
      var _ref2;

      if ((_ref2 = sqlAST) != null ? (_ref2 = _ref2.args) != null ? _ref2.first : _ref2 : _ref2) {
        if (data.length > sqlAST.args.first) {
          pageInfo.hasNextPage = true;
          data.pop();
        }
      } else if (sqlAST.args && sqlAST.args.last) {
        if (data.length > sqlAST.args.last) {
          pageInfo.hasPreviousPage = true;
          data.pop();
        }
        data.reverse();
      }

      const sortKey = sqlAST.sortKey || sqlAST.junction.sortKey;
      const edges = data.map(obj => {
        const cursor = {};
        const key = sortKey.key;
        for (let column of (0, _util.wrap)(key)) {
          cursor[column] = obj[column];
        }
        return { cursor: (0, _util.objToCursor)(cursor), node: obj };
      });
      if (data.length) {
        pageInfo.startCursor = edges[0].cursor;
        pageInfo.endCursor = (0, _util.last)(edges).cursor;
      }
      return { edges, pageInfo, _paginated: true };
    }
    if (sqlAST.orderBy || sqlAST.junction && sqlAST.junction.orderBy) {
      var _ref;

      let offset = 0;
      if ((_ref = sqlAST) != null ? (_ref = _ref.args) != null ? _ref.after : _ref : _ref) {
        offset = (0, _graphqlRelay.cursorToOffset)(sqlAST.args.after) + 1;
      }

      const arrayLength = data[0] && parseInt(data[0].$total, 10);
      const connection = (0, _graphqlRelay.connectionFromArraySlice)(data, sqlAST.args || {}, { sliceStart: offset, arrayLength });
      connection.total = arrayLength || 0;
      connection._paginated = true;
      return connection;
    }
  }
  return data;
}

exports.default = arrToConnection;


function recurseOnObjInData(dataObj, astChild) {
  const dataChild = dataObj[astChild.fieldName];
  if (dataChild) {
    dataObj[astChild.fieldName] = arrToConnection(dataObj[astChild.fieldName], astChild);
  }
}