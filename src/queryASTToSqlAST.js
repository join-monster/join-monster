import assert from 'assert'

import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLList
} from 'graphql'

export default function queryASTToSqlAST(ast) {
  // we need to guard against two tables being aliased to the same thing, so lets keep track of that
  const usedTableAliases = new Set

  // we'll build up the AST representing the SQL recursively
  const sqlAST = {}
  assert.equal(ast.fieldASTs.length, 1, 'We thought this would always have a length of 1. FIX ME!!')

  // this represents the parsed query
  const queryAST = ast.fieldASTs[0]
  // ast.parentType is from the schema, its the GraphQLObjectType that is parent to the current field
  // this allows us to get the field definition of the current field so we can grab that extra metadata
  // e.g. sqlColumn or sqlJoin, etc.
  const parentType = ast.parentType
  getGraphQLType(queryAST, parentType, sqlAST)
  return sqlAST

  function getGraphQLType(queryASTNode, parentTypeNode, sqlASTNode) {
    // first, get the name of the field being queried
    const fieldName = queryASTNode.name.value
    // then, get the field from the schema definition
    const field = parentTypeNode._fields[fieldName]

    // this flag will keep track of whether multiple rows are needed
    let grabMany = false
    // the actual type might be wrapped in a GraphQLNonNull type
    let gqlType = stripNonNullType(field.type)

    // if list then mark flag true & get the type inside the GraphQLList container type
    if (gqlType instanceof GraphQLList) {
      gqlType = gqlType.ofType
      grabMany = true
    }

    // the typeConfig has all the keyes from the GraphQLObjectType definition
    const config = gqlType._typeConfig

    // is this a table in SQL?
    if (gqlType instanceof GraphQLObjectType && config.sqlTable) {
      sqlASTNode.table = config.sqlTable

      // take the field name as the default alias
      let alias = field.as || field.name
      // but if that's already in use, just add an _ at the end
      if (usedTableAliases.has(alias)) {
        alias += '_'
      }
      usedTableAliases.add(alias)
      sqlASTNode.as = alias

      sqlASTNode.fieldName = field.name
      sqlASTNode.grabMany = grabMany
      sqlASTNode.sqlJoin = field.sqlJoin
      // tables have child fields, lets push them to an array
      sqlASTNode.children = []
      if (queryASTNode.selectionSet) {
        for (let selection of queryASTNode.selectionSet.selections) {
          const newNode = {}
          sqlASTNode.children.push(newNode)
          // recurse down and build up the new node for this child field
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
    } else {
      throw new Error(`Your GraphQL field "${fieldName}" needs additional metadata for join-monster. Object Types need a "sqlTable".`)
    }
  }
}

function stripNonNullType(type) {
  return type instanceof GraphQLNonNull ? type.ofType : type
}
