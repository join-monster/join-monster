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

/**
 * Uses the resolveType() function to choose which data is selected for a given field.
 *
 * A query that selects different fields from a union type can result in having data from more than one member of the
 * union.
 *
 * For example:
 *   type Post { author: User }
 *   type Comment { author: user }
 *
 *   union WrittenMaterial = Post | Comment
 *
 *   query {
 *       writtenMaterial {
 *           ... on Comment {
 *             author {
 *               capitalizedLastName # <-- First "disjoint" field selection from author type
 *             }
 *           }
 *           ... on Post {
 *             author {
 *               email # <-- Second "disjoint" field selection from author type
 *             }
 *           }
 *       }
 *   }
 *
 *   The data returned from this query, when a Post and a Comment have the same author, can look like this FOR ANY GIVEN
 *   comment OR post:
 *   data: {
 *    "author@Comment": {"id": 1, "capitalizedLastName": "CARLSON"},
 *    "author@Post": {"id": 1, "email": "andrew@stem.is"}
 *   }
 *
 *   Where any particular result is a Comment, we need to pick the Comment-shaped data, and not the Post-shaped data, and vice-versa.
 *
 *   This function calls resolveType() on the schema for the given data in order to pick which key to use for the requested field.
 *
 *   Where it is not possible to use resolveType() to choose, the first-encountered key will be used as the field.
 *
 *   The resolveType function must be a function that takes 0 or 1 arguments and returns a string. It cannot accept the
 *   context or info objects, or return a Promise.
 *
 * @param obj
 * @param childASTsql
 * @param typeName
 * @param qualifiedName
 * @param requestedFieldName
 */
const disambiguateQualifiedTypeFields = (obj, childASTsql, typeName, qualifiedName, requestedFieldName) => {
  const qualifiedValue = obj[qualifiedName]
  delete obj[qualifiedName]

  const resolveType = childASTsql.defferedFrom?.resolveType
  const resolveTypeFn = typeof resolveType === 'function' && resolveType.length < 2 ? resolveType : null
  const resolveTypeResult = resolveTypeFn ? resolveTypeFn(obj) : null
  const discriminatorTypeName = typeof resolveTypeResult === 'string' ? resolveTypeResult : null

  const fieldTypeMatchesResolvedType = discriminatorTypeName && typeName === discriminatorTypeName

  if (!fieldTypeMatchesResolvedType) {
    // Remove the field@TypeName from obj without replacing it
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