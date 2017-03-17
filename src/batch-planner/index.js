import { uniq, chain, map, groupBy, forIn } from 'lodash'
import arrToConnection from '../array-to-connection'
import { handleUserDbCall, maybeQuote, wrap, compileSqlAST } from '../util'


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
    if (childAST.type !== 'table') return

    const fieldName = childAST.fieldName

    // see if any begin a new batch
    if (childAST.sqlBatch || childAST.junctionBatch) {

      let thisKey, parentKey
      if (childAST.sqlBatch) {
        // if so, we know we'll need to get the key for matching with the parent key
        childAST.children.push(childAST.sqlBatch.thisKey)
        thisKey = childAST.sqlBatch.thisKey.fieldName
        parentKey = childAST.sqlBatch.parentKey.fieldName
      } else if (childAST.junctionBatch) {
        childAST.children.push(childAST.junctionBatch.thisKey)
        thisKey = childAST.junctionBatch.thisKey.fieldName
        parentKey = childAST.junctionBatch.parentKey.fieldName
      }

      if (Array.isArray(data)) {
        // the "batch scope" is teh set of values to match this key against from the previous batch
        const batchScope = uniq(data.map(obj => maybeQuote(obj[parentKey])))
        // generate the SQL, with the batch scope values incorporated in a WHERE IN clause
        const { sql, shapeDefinition } = await compileSqlAST(childAST, context, { ...options, batchScope } )
        // grab the data
        let newData = await handleUserDbCall(dbCall, sql, wrap(shapeDefinition))
        // group the rows by the key so we can match them with the previous batch
        newData = groupBy(newData, thisKey)
        // but if we paginate, we must convert to connection type first
        if (childAST.paginate) {
          forIn(newData, (group, key, obj) => {
            obj[key] = arrToConnection(group, childAST)
          })
        }
        // if we they want many rows, give them an array
        if (childAST.grabMany) {
          for (let obj of data) {
            obj[fieldName] = newData[obj[parentKey]] || []
          }
        } else {
          for (let obj of data) {
            obj[fieldName] = arrToConnection(newData[obj[parentKey]][0], childAST)
          }
        }
        // move down a level and recurse
        const nextLevelData = chain(data).filter(obj => obj !== null).flatMap(obj => obj[fieldName]).value()
        return nextBatch(childAST, nextLevelData, dbCall, context, options)
      } else {
        const batchScope = [ maybeQuote(data[parentKey]) ]
        const { sql, shapeDefinition } = await compileSqlAST(childAST, context, { ...options, batchScope } )
        let newData = await handleUserDbCall(dbCall, sql, wrap(shapeDefinition))
        newData = groupBy(newData, thisKey)
        if (childAST.paginate){
          const targets = newData[data[parentKey]]
          data[fieldName] = arrToConnection(targets, childAST)
        } else {
          if (childAST.grabMany) {
            data[fieldName] = newData[data[parentKey]] || []
          } else {
            const targets = newData[data[parentKey]] || []
            data[fieldName] = targets[0]
          }
        }
        return nextBatch(childAST, data[fieldName], dbCall, context, options)
      }
    // otherwise, just bypass this and recurse down to the next level
    } else {
      if (Array.isArray(data)) {
        const nextLevelData = chain(data).filter(obj => obj !== null).flatMap(obj => obj[fieldName]).value()
        return nextBatch(childAST, nextLevelData, dbCall, context, options)
      } else if (data) {
        return nextBatch(childAST, data[fieldName], dbCall, context, options)
      }
    }
  }))
}
