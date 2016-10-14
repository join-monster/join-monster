import { base64 } from './util'

function postProcess(data, sqlAST) {
  if (sqlAST.paginate) {
    let edges = []
    let pageInfo = {}
    const key = sqlAST.sortKey
    let hasNextPage = false
    let hasPreviousPage = false
    if (sqlAST.args.first) {
      if (data.length > sqlAST.args.first) {
        data.pop()
        hasNextPage = true
      }
      edges = data.map(obj => {
        const value = obj[sqlAST.sortKey]
        return {
          cursor: base64(`${key}:${value}`),
          node: obj
        }
      })
      pageInfo = {
        hasNextPage,
        hasPreviousPage
      }
      if (data[0]) {
        pageInfo.startCursor = base64(`${key}:${data[0].$start}`)
        pageInfo.endCursor = base64(`${key}:${data[0].$end}`)
      }
    }
    return {
      edges, pageInfo
    }
  }
  // TODO: handle if data is an array
  for (let child of sqlAST.children || []) {
    const dataChild = data[child.fieldName]
    if (dataChild) {
      data[child.fieldName] = postProcess(data[child.fieldName], child)
    }
  }
  return data
}

export default postProcess


