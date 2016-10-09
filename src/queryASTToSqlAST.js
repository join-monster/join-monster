import assert from 'assert'
import G from 'generatorics'


export function queryASTToSqlAST(ast) {
  // we need to guard against two tables being aliased to the same thing, so lets keep track of that
  //const usedTableAliases = new Set
  const mininyms = G.baseNAll('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#$')

  // we'll build up the AST representing the SQL recursively
  const sqlAST = {}
  assert.equal(ast.fieldASTs.length, 1, 'We thought this would always have a length of 1. FIX ME!!')

  // this represents the parsed query
  const queryAST = ast.fieldASTs[0]
  // ast.parentType is from the schema, its the GraphQLObjectType that is parent to the current field
  // this allows us to get the field definition of the current field so we can grab that extra metadata
  // e.g. sqlColumn or sqlJoin, etc.
  const parentType = ast.parentType
  getGraphQLType(queryAST, parentType, sqlAST, ast.fragments, mininyms)
  return sqlAST

}

export function getGraphQLType(queryASTNode, parentTypeNode, sqlASTNode, fragments, mininyms) {
  // first, get the name of the field being queried
  const fieldName = queryASTNode.name.value
  // then, get the field from the schema definition
  let field = parentTypeNode._fields[fieldName]

  // this flag will keep track of whether multiple rows are needed
  let grabMany = false
  // the actual type might be wrapped in a GraphQLNonNull type
  let gqlType = stripNonNullType(field.type)

  // if list then mark flag true & get the type inside the GraphQLList container type
  if (gqlType.constructor.name === 'GraphQLList') {
    gqlType = gqlType.ofType
    grabMany = true
  }

  // if its a relay connection, there are several things we need to do
  if (/Connection$/.test(gqlType.name) && gqlType.constructor.name === 'GraphQLObjectType' && gqlType._fields.edges) {
    grabMany = true
    // grab the types and fields inside the connection
    const stripped = stripRelayConnection(field, queryASTNode)
    // reassign those
    gqlType = stripped.gqlType
    queryASTNode = stripped.queryASTNode
    // we'll set a flag for pagination. not being used yet. for future optimization
    sqlASTNode.relayPaging = true
  }
  // the typeConfig has all the keyes from the GraphQLObjectType definition
  const config = gqlType._typeConfig

  // is this a table in SQL?
  if (gqlType.constructor.name === 'GraphQLObjectType' && config.sqlTable) {
    handleTable(sqlASTNode, queryASTNode, field, gqlType, fragments, mininyms, grabMany)
  // is it just a column? if they specified a sqlColumn or they didn't define a resolver, yeah
  } else if (field.sqlColumn || !field.resolve) {
    sqlASTNode.type = 'column'
    sqlASTNode.name = field.sqlColumn || field.name
    sqlASTNode.fieldName = field.name
    sqlASTNode.as = mininyms.next().value.join('')
  // or maybe it just depends on some SQL columns
  } else if (field.sqlDeps) {
    sqlASTNode.type = 'columnDeps'
    sqlASTNode.name = field.sqlDeps
  // maybe this node wants no business with your SQL, because it has its own resolver
  } else {
    sqlASTNode.type = 'noop'
  }
}

function handleTable(sqlASTNode, queryASTNode, field, gqlType, fragments, mininyms, grabMany) {
  const config = gqlType._typeConfig

  sqlASTNode.type = 'table'
  sqlASTNode.name = config.sqlTable

  // the graphQL field name will be the default alias for the table
  // if thats taken, this function will just add an underscore to the end to make it unique
  sqlASTNode.as = mininyms.next().value.join('')

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
    sqlASTNode.joinTableAs = mininyms.next().value.join('')
  }

  // tables have child fields, lets push them to an array
  const children = sqlASTNode.children = []

  // the NestHydrationJS library only treats the first column as the unique identifier, therefore we
  // need whichever column that the schema specifies as the unique one to be the first child
  if (!config.uniqueKey) {
    throw new Error(`You must specify the "uniqueKey" on the GraphQLObjectType definition of ${config.sqlTable}`)
  }
  if (typeof config.uniqueKey === 'string') {
    children.push({
      type: 'column',
      name: config.uniqueKey,
      fieldName: config.uniqueKey,
      as: mininyms.next().value.join('')
    })
  } else if (Array.isArray(config.uniqueKey)) {
    children.push({
      type: 'composite',
      name: config.uniqueKey,
      fieldName: config.uniqueKey.join('#'),
      as: mininyms.next().value.join('')
    })
  }

  if (queryASTNode.selectionSet) {
    for (let selection of queryASTNode.selectionSet.selections) {
      // we need to figure out what kind of selection this is
      switch (selection.kind) {
      // if its another field, recurse through that
      case 'Field':
        growNewTreeAndAddToChildren(children, selection, gqlType, fragments, mininyms)
        break
      // if its an inline fragment, it has some fields and we gotta recurse thru all them
      case 'InlineFragment':
        // check to make sure the type of this fragment matches the type being queried
        // this became necessary when supporting queries on the Relay Node type
        if (selection.typeCondition.name.value === gqlType.name) {
          for (let fragSelection of selection.selectionSet.selections) {
            growNewTreeAndAddToChildren(children, fragSelection, gqlType, fragments, mininyms)
          }
        }
        break
      // if its a named fragment, we need to grab the fragment definition by its name and recurse over those fields
      case 'FragmentSpread':
        const fragmentName = selection.name.value
        const fragment = fragments[fragmentName]
        // make sure fragment type matches the type being queried
        if (fragment.typeCondition.name.value === gqlType.name) {
          for (let fragSelection of fragment.selectionSet.selections) {
            growNewTreeAndAddToChildren(children, fragSelection, gqlType, fragments, mininyms)
          }
        }
        break
      default:
        throw new Error('Unknown selection kind: ' + selection.kind)
      }
    }
  }
}

function stripRelayConnection(field, queryASTNode) {
  // get the GraphQL Type inside the list of edges inside the Node from the schema definition
  const gqlType = field.type._fields.edges.type.ofType._fields.node.type
  // let's remember those arguments on the connection
  const args = queryASTNode.arguments
  // and then find the fields being selected on the underlying type, also buried within edges and Node
  const edges = queryASTNode.selectionSet.selections.find(selection => selection.name.value === 'edges')
  if (edges) {
    queryASTNode = edges.selectionSet.selections.find(selection => selection.name.value === 'node') || {}
  } else {
    queryASTNode = {}
  }
  // place the arguments on this inner field, so our SQL AST picks it up later
  queryASTNode.arguments = args
  return { gqlType, queryASTNode }
}

function growNewTreeAndAddToChildren(children, selection, graphQLType, fragments, usedTableAliases) {
  const newNode = {}
  children.push(newNode)
  getGraphQLType(selection, graphQLType, newNode, fragments, usedTableAliases)
}

function stripNonNullType(type) {
  return type.constructor.name === 'GraphQLNonNull' ? type.ofType : type
}

// our table aliases need to be unique. simply check if we've used this ailas already. if we have, just add a "$" at the end
//function makeUnique(usedNames, name) {
  //if (usedNames.has(name)) {
    //name += '$'
  //}
  //usedNames.add(name)
  //return name
//}
