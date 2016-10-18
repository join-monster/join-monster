import { connectionFromArraySlice, cursorToOffset } from 'graphql-relay'
import { objToCursor, wrap, last } from './util'

// a function for data manipulation AFTER its nested.
// this is only necessary when using the SQL pagination
// we have to interpret the slice that comes back and generate the connection object
function postProcess(data, sqlAST) {
  // use "post-order" tree traversal
  for (let astChild of sqlAST.children || []) {
    if (Array.isArray(data)) {
      for (let dataItem of data) {
        recurseOnObjInData(dataItem, astChild)
      }
    }
    recurseOnObjInData(data, astChild)
  }
  // is cases where pagination was done, take the data and convert to the connection object
  if (sqlAST.paginate && sqlAST.sortKey) {
    const pageInfo = {
      hasNextPage: false,
      hasPreviousPage: false
    }
    if (sqlAST.args && sqlAST.args.first) {
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
    const edges = data.map(obj => {
      const cursor = {}
      const key = sqlAST.sortKey.key
      for (let column of wrap(key)) {
        cursor[column] = obj[column]
      }
      return { cursor: objToCursor(cursor), node: obj }
    })
    if (data.length) {
      pageInfo.startCursor = edges[0].cursor
      pageInfo.endCursor = last(edges).cursor
    }
    return { edges, pageInfo }
  } else if (sqlAST.paginate && sqlAST.orderBy) {
    let offset = 0
    if (sqlAST.args && sqlAST.args.after) {
      offset = cursorToOffset(sqlAST.args.after) + 1
    }
    // $total was a special column for determining the total number of items
    const arrayLength = data[0] && parseInt(data[0].$total)
    const connection = connectionFromArraySlice(data, sqlAST.args || {}, { sliceStart: offset, arrayLength })
    connection.pageInfo.total = arrayLength
    return connection
  }
  return data
}

export default postProcess

function recurseOnObjInData(dataObj, astChild) {
  const dataChild = dataObj[astChild.fieldName]
  if (dataChild) {
    dataObj[astChild.fieldName] = postProcess(dataObj[astChild.fieldName], astChild)
  }
}

