import { chain } from 'lodash'
import { isEmptyArray } from './util'

// union types have additional processing. the field names have a @ and the typename appended to them.
// need to strip those off and take whichever of those values match the type discriminator specified in resolveType
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
            disambiguateQualifiedTypeFields(obj, child, typeName, qualifiedName, fieldName)
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
          disambiguateQualifiedTypeFields(data, child, typeName, qualifiedName, fieldName)

          if (child.type === 'table' || child.type === 'union') {
            resolveUnions(data[fieldName], child)
          }
        }
      }
    }
  }
  if (sqlAST.type === 'table' || sqlAST.type === 'union') {
    for (let child of sqlAST.children) {
      if (
        (child.type === 'table' || child.type === 'union') &&
        !child.sqlBatch
      ) {
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

const disambiguateQualifiedTypeFields = (obj, childASTsql, typeName, qualifiedName, requestedFieldName) => {
  const discriminatorTypeName = childASTsql.defferedFrom.resolveType ? childASTsql.defferedFrom.resolveType(obj) : null
  const qualifiedValue = obj[qualifiedName]
  delete obj[qualifiedName]
  if (typeName !== discriminatorTypeName) {
    return
  }

  if (obj[requestedFieldName] == null && qualifiedValue != null) {
    obj[requestedFieldName] = qualifiedValue
  } else if (
      isEmptyArray(obj[requestedFieldName]) &&
      !isEmptyArray(qualifiedValue)
  ) {
    obj[requestedFieldName] = qualifiedValue
  }
}