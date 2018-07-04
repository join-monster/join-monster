import { chain } from 'lodash'
import { isEmptyArray } from './util'

// union types have additional processing. the field names have a @ and the typename appended to them.
// need to strip those off and take whichever of those values are non-null
export default function resolveUnions(data, sqlAST) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return
  }

  if (sqlAST.type === 'union') {
    for (let typeName in sqlAST.typedChildren) {
      const suffix = '@' + typeName
      const children = sqlAST.typedChildren[typeName]
      for (let child of children) {
        const fieldName = child.fieldName
        const qualifiedName = child.fieldName + suffix
        if (Array.isArray(data)) {
          for (let obj of data) {
            const qualifiedValue = obj[qualifiedName]
            delete obj[qualifiedName]
            if (obj[fieldName] == null && qualifiedValue != null) {
              obj[fieldName] = qualifiedValue
            } else if (isEmptyArray(obj[fieldName]) && !isEmptyArray(qualifiedValue)) {
              obj[fieldName] = qualifiedValue
            }
          }
          if (child.type === 'table' || child.type === 'union') {
            const nextLevelData = chain(data)
              .filter(obj => obj != null)
              .flatMap(obj => obj[fieldName])
              .filter(obj => obj != null)
              .value()
            resolveUnions(nextLevelData, child)
          }
        } else {
          const qualifiedValue = data[qualifiedName]
          delete data[qualifiedName]
          if (data[fieldName] == null && qualifiedValue != null) {
            data[fieldName] = qualifiedValue
          } else if (isEmptyArray(data[fieldName]) && !isEmptyArray(qualifiedValue)) {
            data[fieldName] = qualifiedValue
          }
          if (child.type === 'table' || child.type === 'union') {
            resolveUnions(data[fieldName], child)
          }
        }
      }
    }
  }
  if (sqlAST.type === 'table' || sqlAST.type === 'union') {
    for (let child of sqlAST.children) {
      if ((child.type === 'table' || child.type === 'union') && !child.sqlBatch) {
        const fieldName = child.fieldName
        if (Array.isArray(data)) {
          const nextLevelData = chain(data)
            .filter(obj => obj != null)
            .flatMap(obj => obj[fieldName])
            .filter(obj => obj != null)
            .value()
          resolveUnions(nextLevelData, child)
        } else {
          resolveUnions(data[fieldName], child)
        }
      }
    }
  }
}
