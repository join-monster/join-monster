import assert from 'assert'

import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLList
} from 'graphql'

export default function queryASTToSqlAST(ast) {
  const sqlAST = {}
  assert.equal(ast.fieldASTs.length, 1, 'We thought this would always have a length of 1. FIX ME!!')
  const queryAST = ast.fieldASTs[0]
  getGraphQLType(queryAST, ast.parentType, sqlAST)
  return sqlAST

  function getGraphQLType(queryASTNode, parentTypeNode, sqlASTNode) {
    // first, get the field from the schema definition
    const fieldName = queryASTNode.name.value
    const field = parentTypeNode._fields[fieldName]
    // this flag will keep track of whether multiple rows are needed
    let grabMany = false
    // wrapper function will "go through" the graphql container types to get the type contained within
    let gqlType = stripNonNullType(field.type)

    // if list then mark flag true & skip thru
    if (gqlType instanceof GraphQLList) {
      gqlType = gqlType.ofType
      grabMany = true
    }

    // the typeConfig has all the keyes from the ObjectType definition
    const config = gqlType._typeConfig

    // is this a table in SQL?
    if (gqlType instanceof GraphQLObjectType && config.sqlTable) {
      sqlASTNode.table = config.sqlTable
      sqlASTNode.as = field.as || field.name
      sqlASTNode.fieldName = field.name
      sqlASTNode.grabMany = grabMany
      sqlASTNode.sqlJoin = field.sqlJoin
      sqlASTNode.children = []
      if (queryASTNode.selectionSet) {
        for (let selection of queryASTNode.selectionSet.selections) {
          const newNode = {}
          sqlASTNode.children.push(newNode)
          getGraphQLType(selection, gqlType, newNode)
        }
      }
    // is it just a column? if they specified a sqlColumn or they didn't define a resolver, yeah
    } else if (field.sqlColumn || !field.resolve) {
      sqlASTNode.column = field.sqlColumn || field.name
      sqlASTNode.fieldName = field.name
    // or maybe it just depends on some SQL columns
    } else if (field.sqlDeps) {
      sqlASTNode.columnDeps = field.sqlDeps
    }
  }
}

function stripNonNullType(type) {
  return type instanceof GraphQLNonNull ? type.ofType : type
}
