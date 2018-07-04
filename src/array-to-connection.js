import { connectionFromArraySlice, cursorToOffset } from 'graphql-relay'
import { objToCursor, wrap, last } from './util'
import idx from 'idx'

// a function for data manipulation AFTER its nested.
// this is only necessary when using the SQL pagination
// we have to interpret the slice that comes back and generate the Connection Object type
function arrToConnection(data, sqlAST) {
  // use "post-order" tree traversal
  for (let astChild of sqlAST.children || []) {
    if (Array.isArray(data)) {
      for (let dataItem of data) {
        recurseOnObjInData(dataItem, astChild)
      }
    } else if (data) {
      recurseOnObjInData(data, astChild)
    }
  }
  const pageInfo = {
    hasNextPage: false,
    hasPreviousPage: false
  }
  if (!data) {
    if (sqlAST.paginate) {
      return {
        pageInfo,
        edges: []
      }
    }
    return null
  }
  // is cases where pagination was done, take the data and convert to the connection object
  // if any two fields happen to become a reference to the same object (when their `uniqueKey`s are the same),
  // we must prevent the recursive processing from visting the same object twice, because mutating the object the first
  // time changes it everywhere. we'll set the `_paginated` property to true to prevent this
  if (sqlAST.paginate && !data._paginated) {
    if (sqlAST.sortKey || idx(sqlAST, _ => _.junction.sortKey)) {
      if (idx(sqlAST, _ => _.args.first)) {
        // we fetched an extra one in order to determine if there is a next page, if there is one, pop off that extra
        if (data.length > sqlAST.args.first) {
          pageInfo.hasNextPage = true
          data.pop()
        }
      } else if (sqlAST.args && sqlAST.args.last) {
        // if backward paging, do the same, but also reverse it
        if (data.length > sqlAST.args.last) {
          pageInfo.hasPreviousPage = true
          data.pop()
        }
        data.reverse()
      }
      // convert nodes to edges and compute the cursor for each
      // TODO: only compute all the cursor if asked for them
      const sortKey = sqlAST.sortKey || sqlAST.junction.sortKey
      const edges = data.map(obj => {
        const cursor = {}
        const key = sortKey.key
        for (let column of wrap(key)) {
          cursor[column] = obj[column]
        }
        return { cursor: objToCursor(cursor), node: obj }
      })
      if (data.length) {
        pageInfo.startCursor = edges[0].cursor
        pageInfo.endCursor = last(edges).cursor
      }
      return { edges, pageInfo, _paginated: true }
    }
    if (sqlAST.orderBy || (sqlAST.junction && sqlAST.junction.orderBy)) {
      let offset = 0
      if (idx(sqlAST, _ => _.args.after)) {
        offset = cursorToOffset(sqlAST.args.after) + 1
      }
      // $total was a special column for determining the total number of items
      const arrayLength = data[0] && parseInt(data[0].$total, 10)
      const connection = connectionFromArraySlice(data, sqlAST.args || {}, { sliceStart: offset, arrayLength })
      connection.total = arrayLength || 0
      connection._paginated = true
      return connection
    }
  }
  return data
}

export default arrToConnection

function recurseOnObjInData(dataObj, astChild) {
  const dataChild = dataObj[astChild.fieldName]
  if (dataChild) {
    dataObj[astChild.fieldName] = arrToConnection(dataObj[astChild.fieldName], astChild)
  }
}
