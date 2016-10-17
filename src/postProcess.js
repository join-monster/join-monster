import { base64, parseCursor } from './util'

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
  if (sqlAST.paginate) {
    let edges = []
    let pageInfo = {}
    let hasNextPage = false
    let hasPreviousPage = false
    if (sqlAST.args && sqlAST.args.first) {
      if (data.length > sqlAST.args.first) {
        data.pop()
        hasNextPage = true
      }
      let offset = 0
      if (sqlAST.args.after) {
        offset = parseInt(parseCursor(sqlAST.args.after)) + 1
      }
      edges = data.map((obj, i) => {
        return {
          cursor: base64(`offset:${offset + i}`),
          node: obj
        }
      })
      pageInfo = {
        hasNextPage,
        hasPreviousPage
      }
      if (data[0]) {
        pageInfo.startCursor = base64(`offset:${offset}`)
        pageInfo.endCursor = base64(`offset:${offset + edges.length - 1}`)
      }
    }
    return {
      edges, pageInfo
    }
  }
  return data
}

export default postProcess


