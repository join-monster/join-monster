import assert from 'assert'


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
    if (gqlType.constructor.name === 'GraphQLList') {
      gqlType = gqlType.ofType
      grabMany = true
    }

    // the typeConfig has all the keyes from the GraphQLObjectType definition
    const config = gqlType._typeConfig

    // is this a table in SQL?
    if (gqlType.constructor.name === 'GraphQLObjectType' && config.sqlTable) {
      sqlASTNode.table = config.sqlTable
      if (!config.sqlTable) {
        throw new Error(`Must specify "sqlTable" property on ${field.type.name} GraphQLObjectType definition.`)
      }

      // the graphQL field name will be the default alias for the table
      // if thats taken, this function will just add an underscore to the end to make it unique
      sqlASTNode.as = makeUnique(usedTableAliases, field.name)

      // add the arguments that were passed, if any.
      if (queryASTNode.arguments.length) {
        const args = sqlASTNode.args = {}
        for (let arg of queryASTNode.arguments) {
          args[arg.name.value] = arg.value.value
        }
      }

      sqlASTNode.fieldName = field.name
      sqlASTNode.grabMany = grabMany

      if (field.where) {
        sqlASTNode.where = field.where
      }
      if (field.sqlJoin) {
        sqlASTNode.sqlJoin = field.sqlJoin
      }
      if (field.joinTable) {
        sqlASTNode.sqlJoins = field.sqlJoins
        sqlASTNode.joinTable = field.joinTable
        sqlASTNode.joinTableAs = makeUnique(usedTableAliases, field.joinTable)
      }

      // tables have child fields, lets push them to an array
      sqlASTNode.children = []
      // if getting many, we need a unique identifier to dedup the results
      // the NestHydrationJS library only treats the first column as the unique identifier, therefore we
      // need whichever column that the schema specifies as the unique one to be the first child
      if (grabMany) {
        if (!config.uniqueKey) {
          throw new Error(`Requesting a list of ${config.sqlTable}. You must specify the "uniqueKey" on the GraphQLObjectType definition`)
        }
        sqlASTNode.children.push({ column: config.uniqueKey, fieldName: config.uniqueKey })
      }
      if (queryASTNode.selectionSet) {
        for (let selection of queryASTNode.selectionSet.selections) {
          // we need to figure out what kind of selection this is
          switch (selection.kind) {
          // if its another field, recurse through that
          case 'Field':
            growNewTreeAndAddToChildren(sqlASTNode.children, selection, gqlType)
            break
          // if its an inline fragment, it has some fields and we gotta recurse thru all them
          case 'InlineFragment':
            for (let fragSelection of selection.selectionSet.selections) {
              growNewTreeAndAddToChildren(sqlASTNode.children, fragSelection, gqlType)
            }
            break
          // if its a named fragment, we need to grab the fragment definition by its name and recurse over those fields
          case 'FragmentSpread':
            const fragmentName = selection.name.value
            const fragment = ast.fragments[fragmentName]
            for (let fragSelection of fragment.selectionSet.selections) {
              growNewTreeAndAddToChildren(sqlASTNode.children, fragSelection, gqlType)
            }
            break
          default:
            throw new Error('Unknown selection kind: ' + selection.kind)
          }
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
      sqlASTNode.noop = true
    }
  }

  function growNewTreeAndAddToChildren(children, selection, graphQLType) {
    const newNode = {}
    children.push(newNode)
    getGraphQLType(selection, graphQLType, newNode)
  }
}

function stripNonNullType(type) {
  return type.constructor.name === 'GraphQLNonNull' ? type.ofType : type
}

// our table aliases need to be unique. simply check if we've used this ailas already. if we have, just add a "$" at the end
function makeUnique(usedNames, name) {
  if (usedNames.has(name)) {
    name += '$'
  }
  usedNames.add(name)
  return name
}
