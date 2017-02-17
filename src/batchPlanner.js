import { uniq, chain, map, flatMap, groupBy, forIn } from 'lodash'
import arrToConnection from './arrToConnection'
import { handleUserDbCall, maybeQuote, wrap, compileSqlAST } from './util'


export default async function nextBatch(sqlAST, data, dbCall, context, options) {
  // paginated fields are wrapped in connections. strip those off for the batching
  if (sqlAST.paginate) {
    if (Array.isArray(data)) {
      data = chain(data).flatMap('edges').map('node').value()
    } else {
      data = map(data.edges, 'node')
    }
  }
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return 
  }


  // loop through all the child fields that are tables
  return Promise.all(sqlAST.children.map(async childAST => {
    if (childAST.type === 'table') {
      const fieldName = childAST.fieldName
      // see if any begin a new batch
      if (childAST.sqlBatch || childAST.junctionBatch) {
        let thisField, parentField
        if (childAST.sqlBatch) {
          childAST.children.push(childAST.sqlBatch.thisKey)
          thisField = childAST.sqlBatch.thisKey.fieldName
          parentField = childAST.sqlBatch.parentKey.fieldName
        } else if (childAST.junctionBatch) {
          childAST.children.push(childAST.junctionBatch.thisKey)
          thisField = childAST.junctionBatch.thisKey.fieldName
          parentField = childAST.junctionBatch.parentKey.fieldName
        }
        if (Array.isArray(data)) {
          const batchScope = uniq(data.map(obj => maybeQuote(obj[parentField])))
          const { sql, shapeDefinition } = await compileSqlAST(childAST, context, { ...options, batchScope } )
          let newData = await handleUserDbCall(dbCall, sql, wrap(shapeDefinition))
          newData = groupBy(newData, thisField)
          if (childAST.paginate) {
            forIn(newData, (group, key, obj) => {
              obj[key] = arrToConnection(group, childAST)
            })
          }
          if (childAST.grabMany) {
            for (let obj of data) {
              obj[fieldName] = newData[obj[parentField]] || []
            }
          } else {
            for (let obj of data) {
              obj[fieldName] = arrToConnection(newData[obj[parentField]][0], childAST)
            }
          }
          const nextLevelData = flatMap(data, obj => obj[fieldName])
          return nextBatch(childAST, nextLevelData, dbCall, context, options)
        } else {
          const batchScope = [ data[parentField] ]
          const { sql, shapeDefinition } = await compileSqlAST(childAST, context, { ...options, batchScope } )
          let newData = await handleUserDbCall(dbCall, sql, wrap(shapeDefinition))
          newData = groupBy(newData, thisField)
          if (childAST.paginate){
            const targets = newData[data[parentField]]
            data[fieldName] = arrToConnection(targets, childAST)
          } else {
            if (childAST.grabMany) {
              data[fieldName] = newData[data[parentField]] || []
            } else {
              const targets = newData[data[parentField]] || []
              data[fieldName] = targets[0]
            }
          }
          return nextBatch(childAST, data[fieldName], dbCall, context, options)
        }
      } else {
        if (Array.isArray(data)) {
          const nextLevelData = flatMap(data, obj => obj[fieldName])
          return nextBatch(childAST, nextLevelData, dbCall, context, options)
        } else {
          if (data) {
            return nextBatch(childAST, data[fieldName], dbCall, context, options)
          }
        }
      }
    }
  }))
}
