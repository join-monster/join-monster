import { connectionFromArraySlice, cursorToOffset } from 'graphql-relay'

function postProcess(data, sqlAST) {
  // TODO: handle if data is an array
  for (let child of sqlAST.children || []) {
    if (Array.isArray(data)) {
      for (let item of data) {
        const dataChild = item[child.fieldName]
        if (dataChild) {
          item[child.fieldName] = postProcess(item[child.fieldName], child)
        }
      }
    }
    const dataChild = data[child.fieldName]
    if (dataChild) {
      data[child.fieldName] = postProcess(data[child.fieldName], child)
    }
  }
  if (sqlAST.paginate && sqlAST.orderBy) {
    let offset = 0
    if (sqlAST.args && sqlAST.args.after) {
      offset = cursorToOffset(sqlAST.args.after) + 1
    }
    const arrayLength = data[0] && parseInt(data[0].$total)
    const connection = connectionFromArraySlice(data, sqlAST.args || {}, { sliceStart: offset, arrayLength })
    connection.pageInfo.total = arrayLength
    return connection
  }
  return data
}

export default postProcess


