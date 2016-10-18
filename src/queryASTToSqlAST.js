import assert from 'assert'
import AliasNamespace from './aliasNamespace'
import { wrap } from './util'


export function queryASTToSqlAST(resolveInfo, options) {
  // this is responsible for all the logic regarding creating SQL aliases
  // we need varying degrees of uniqueness and readability
  const namespace = new AliasNamespace(options.minify)

  // we'll build up the AST representing the SQL recursively
  const sqlAST = {}
  assert.equal(resolveInfo.fieldASTs.length, 1, 'We thought this would always have a length of 1. FIX ME!!')

  // this represents the parsed query
  const queryAST = resolveInfo.fieldASTs[0]
  // resolveInfo.parentType is from the schema, its the GraphQLObjectType that is parent to the current field
  // this allows us to get the field definition of the current field so we can grab that extra metadata
  // e.g. sqlColumn or sqlJoin, etc.
  const parentType = resolveInfo.parentType
  getGraphQLType(queryAST, parentType, sqlAST, resolveInfo.fragments, namespace, options)

  // make sure each "sqlDep" is only specified once at each level. also assign it an alias
  pruneDuplicateSqlDeps(sqlAST, namespace)

  return sqlAST
}

export function getGraphQLType(queryASTNode, parentTypeNode, sqlASTNode, fragments, namespace, options) {
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
  if (/Connection$/.test(gqlType.name) && gqlType.constructor.name === 'GraphQLObjectType' && gqlType._fields.edges && gqlType._fields.pageInfo) {
    grabMany = true
    // grab the types and fields inside the connection
    const stripped = stripRelayConnection(field, queryASTNode)
    // reassign those
    gqlType = stripped.gqlType
    queryASTNode = stripped.queryASTNode
    // we'll set a flag for pagination.
    if (field.sqlPaginate) {
      if (options.dialect !== 'pg') {
        throw new Error('Cannot do SQL pagination for connections with this SQL dialect')
      }
      sqlASTNode.paginate = true
      if (field.sortKey) {
        sqlASTNode.sortKey = field.sortKey
      } else if (field.orderBy) {
        sqlASTNode.orderBy = field.orderBy
      }
    }
  }
  // the typeConfig has all the keyes from the GraphQLObjectType definition
  const config = gqlType._typeConfig

  // is this a table in SQL?
  if (gqlType.constructor.name === 'GraphQLObjectType' && config.sqlTable) {
    handleTable(sqlASTNode, queryASTNode, field, gqlType, fragments, namespace, grabMany, options)
  // is it just a column? if they specified a sqlColumn or they didn't define a resolver, yeah
  } else if (field.sqlColumn || !field.resolve) {
    sqlASTNode.type = 'column'
    sqlASTNode.name = field.sqlColumn || field.name
    sqlASTNode.fieldName = field.name
    sqlASTNode.as = namespace.generate('column', sqlASTNode.name)
  // or maybe it just depends on some SQL columns
  } else if (field.sqlDeps) {
    sqlASTNode.type = 'columnDeps'
    sqlASTNode.names = field.sqlDeps
  // maybe this node wants no business with your SQL, because it has its own resolver
  } else {
    sqlASTNode.type = 'noop'
  }
}

function handleTable(sqlASTNode, queryASTNode, field, gqlType, fragments, namespace, grabMany, options) {
  const config = gqlType._typeConfig

  sqlASTNode.type = 'table'
  sqlASTNode.name = config.sqlTable

  // the graphQL field name will be the default alias for the table
  // if thats taken, this function will just add an underscore to the end to make it unique
  sqlASTNode.as = namespace.generate('table', field.name)

  // add the arguments that were passed, if any.
  if (queryASTNode.arguments.length) {
    const args = sqlASTNode.args = {}
    for (let arg of queryASTNode.arguments) {
      args[arg.name.value] = parseArgValue(arg.value)
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
    sqlASTNode.joinTableAs = namespace.generate('table', field.joinTable)
  }

  // tables have child fields, lets push them to an array
  const children = sqlASTNode.children = []

  handleUniqueKey(config, children, namespace)

  if (sqlASTNode.paginate) {
    handleColumnsRequiredForPagination(sqlASTNode, namespace)
  }

  if (queryASTNode.selectionSet) {
    handleSelections(children, queryASTNode.selectionSet.selections, gqlType, fragments, namespace, options)
  }
}

// the selections could be several types, recursively handle each type here
function handleSelections(children, selections, gqlType, fragments, namespace, options) {
  for (let selection of selections) {
    // we need to figure out what kind of selection this is
    switch (selection.kind) {
    // if its another field, recurse through that
    case 'Field':
      const newNode = {}
      children.push(newNode)
      getGraphQLType(selection, gqlType, newNode, fragments, namespace, options)
      break
    // if its an inline fragment, it has some fields and we gotta recurse thru all them
    case 'InlineFragment':
      // check to make sure the type of this fragment matches the type being queried
      // this became necessary when supporting queries on the Relay Node type
      if (selection.typeCondition.name.value === gqlType.name) {
        handleSelections(children, selection.selectionSet.selections, gqlType, fragments, namespace, options)
      }
      break
    // if its a named fragment, we need to grab the fragment definition by its name and recurse over those fields
    case 'FragmentSpread':
      const fragmentName = selection.name.value
      const fragment = fragments[fragmentName]
      // make sure fragment type matches the type being queried
      if (fragment.typeCondition.name.value === gqlType.name) {
        handleSelections(children, fragment.selectionSet.selections, gqlType, fragments, namespace, options)
      }
      break
    default:
      throw new Error('Unknown selection kind: ' + selection.kind)
    }
  }
}

function handleUniqueKey(config, children, namespace) {
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
      as: namespace.generate('column', config.uniqueKey)
    })
  } else if (Array.isArray(config.uniqueKey)) {
    const clumsyName = config.uniqueKey.join('#') // need a name for this column, smash the individual column names together
    children.push({
      type: 'composite',
      name: config.uniqueKey,
      fieldName: clumsyName,
      as: namespace.generate('column', clumsyName)
    })
  }
}

function handleColumnsRequiredForPagination(sqlASTNode, namespace) {
  if (sqlASTNode.sortKey) {
    // this type of paging uses the "sort key(s)". we need to get this in order to generate the cursor
    for (let column of wrap(sqlASTNode.sortKey.key)) {
      const newChild = {
        type: 'column',
        name: column,
        fieldName: column,
        as: namespace.generate('column', column)
      }
      // if this joining on a "through-table", the sort key is on the threw table instead of this node's parent table
      if (sqlASTNode.joinTable) {
        newChild.fromOtherTable = sqlASTNode.joinTableAs
      }
      sqlASTNode.children.push(newChild)
    }
  } else if (sqlASTNode.orderBy) {
    // this type of paging can visit arbitrary pages, so lets provide the total number of items
    // on this special "$total" column which we will compute in the query
    const newChild = {
      type: 'column',
      name: '$total',
      fieldName: '$total',
      as: namespace.generate('column', '$total')
    }
    if (sqlASTNode.joinTable) {
      newChild.fromOtherTable = sqlASTNode.joinTableAs
    }
    sqlASTNode.children.push(newChild)
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

function stripNonNullType(type) {
  return type.constructor.name === 'GraphQLNonNull' ? type.ofType : type
}

export function pruneDuplicateSqlDeps(sqlAST, namespace) {
  // keep track of all the dependent columns at this depth in a Set (for uniqueness)
  const deps = new Set
  const children = sqlAST.children

  // loop thru each child which has "columnDeps", remove it from the tree, and add it to the set
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]
    if (child.type === 'columnDeps') {
      child.names.forEach(name => deps.add(name))
      children.splice(i, 1)
    // or if its another table, recurse on it
    } else if (child.type === 'table') {
      pruneDuplicateSqlDeps(child, namespace)
    }
  }

  // now that we collected the "columnDeps", add them all to one node
  // the "names" property will put all the column names in an object as keys
  // the values of this object will be the SQL alias
  const newNode = {
    type: 'columnDeps',
    names: {}
  }
  deps.forEach(name => {
    newNode.names[name] = namespace.generate('column', name)
  })
  children.push(newNode)
}

function parseArgValue(value) {
  let primitive = value.value
  // TODO parse other kinds of variables
  if (value.kind === 'IntValue') {
    primitive = parseInt(primitive)
  }
  return primitive
}

