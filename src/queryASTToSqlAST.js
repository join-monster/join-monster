import assert from 'assert'
import { flatMap } from 'lodash'
import AliasNamespace from './aliasNamespace'
import { wrap } from './util'


export function queryASTToSqlAST(resolveInfo, options) {
  // this is responsible for all the logic regarding creating SQL aliases
  // we need varying degrees of uniqueness and readability
  const namespace = new AliasNamespace(options.minify)

  // we'll build up the AST representing the SQL recursively
  const sqlAST = {}

  // v0.8 changed the "fieldASTs" property to "fieldNodes". we want to support both
  const fieldNodes = resolveInfo.fieldNodes || resolveInfo.fieldASTs 
  assert.equal(fieldNodes.length, 1, 'We thought this would always have a length of 1. FIX ME!!')

  // this represents the parsed query
  const queryAST = fieldNodes[0]
  // resolveInfo.parentType is from the schema, its the GraphQLObjectType that is parent to the current field
  // this allows us to get the field definition of the current field so we can grab that extra metadata
  // e.g. sqlColumn or sqlJoin, etc.
  const parentType = resolveInfo.parentType
  getGraphQLType(queryAST, parentType, sqlAST, resolveInfo.fragments, resolveInfo.variableValues, namespace, 0, options)

  // make sure they started this party on a table
  assert.equal(sqlAST.type, 'table', 'Must call joinMonster in a resolver on a field where the type is decorated with "sqlTable".')

  // make sure each "sqlDep" is only specified once at each level. also assign it an alias
  pruneDuplicateSqlDeps(sqlAST, namespace)

  return sqlAST
}

export function getGraphQLType(queryASTNode, parentTypeNode, sqlASTNode, fragments, variables, namespace, depth, options) {
  // first, get the name of the field being queried
  const fieldName = queryASTNode.name.value

  // if this is an internal field (say, for introspection "__typename"), lets ignore it
  if (fieldName.slice(0, 2) === '__') {
    sqlASTNode.type = 'noop'
    return
  }

  // then, get the field from the schema definition
  let field = parentTypeNode._fields[fieldName]
  if (!field) {
    throw new Error(`The field "${fieldName}" is not in the ${parentTypeNode.name} type.`)
  }

  // this flag will keep track of whether multiple rows are needed
  let grabMany = false
  // the actual type might be wrapped in a GraphQLNonNull type
  let gqlType = stripNonNullType(field.type)

  // add the arguments that were passed, if any.
  if (queryASTNode.arguments.length) {
    const args = sqlASTNode.args = {}
    for (let arg of queryASTNode.arguments) {
      args[arg.name.value] = parseArgValue(arg.value, variables)
    }
  }

  // if list then mark flag true & get the type inside the GraphQLList container type
  if (gqlType.constructor.name === 'GraphQLList') {
    gqlType = stripNonNullType(gqlType.ofType)
    grabMany = true
  }
  
  // if its a relay connection, there are several things we need to do
  if (gqlType.constructor.name === 'GraphQLObjectType' && gqlType._fields.edges && gqlType._fields.pageInfo) {
    grabMany = true
    // grab the types and fields inside the connection
    const stripped = stripRelayConnection(field, queryASTNode, fragments)
    // reassign those
    gqlType = stripped.gqlType
    queryASTNode = stripped.queryASTNode
    // we'll set a flag for pagination.
    if (field.sqlPaginate) {
      sqlASTNode.paginate = true
      getSortColumns(field, sqlASTNode)
    }
  } else {
    if (field.sqlPaginate) {
      throw new Error(`To paginate the ${gqlType.name} type, it must be a GraphQLObjectType that fulfills the relay spec. The type must have a "pageInfo" and "edges" field. https://facebook.github.io/relay/graphql/connections.htm`)
    }
  }
  // the typeConfig has all the keyes from the GraphQLObjectType definition
  const config = gqlType._typeConfig

  // is this a table in SQL?
  if (gqlType.constructor.name === 'GraphQLObjectType' && config.sqlTable) {
    if (depth >= 1) {
      assert(field.sqlJoin || field.sqlBatch || field.junctionTable, `If an Object type maps to a SQL table and has a child which is another Object type that also maps to a SQL table, you must define "sqlJoin", "sqlBatch", or "junctionTable" on that field to tell joinMonster how to fetch it. Check the "${fieldName}" field on the "${parentTypeNode.name}" type.`)
    }
    handleTable(sqlASTNode, queryASTNode, field, gqlType, fragments, variables, namespace, grabMany, depth, options)
  // is this a raw expression?
  } else if (field.sqlExpr) {
    sqlASTNode.type = 'expression'
    sqlASTNode.sqlExpr = field.sqlExpr
    sqlASTNode.fieldName = field.name
    sqlASTNode.as = namespace.generate('column', field.name)
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

function handleTable(sqlASTNode, queryASTNode, field, gqlType, fragments, variables, namespace, grabMany, depth, options) {
  const config = gqlType._typeConfig

  sqlASTNode.type = 'table'
  sqlASTNode.name = config.sqlTable

  // the graphQL field name will be the default alias for the table
  // if thats taken, this function will just add an underscore to the end to make it unique
  sqlASTNode.as = namespace.generate('table', field.name)

  // tables have child fields, lets push them to an array
  const children = sqlASTNode.children = []

  sqlASTNode.fieldName = field.name
  sqlASTNode.grabMany = grabMany

  if (field.where) {
    sqlASTNode.where = field.where
  }
  if (field.sqlJoin) {
    sqlASTNode.sqlJoin = field.sqlJoin
  }
  else if (field.junctionTable || field.joinTable) {
    assert(field.sqlJoins || field.junctionBatch, 'Must define `sqlJoins` (plural) or `junctionBatch` for a many-to-many.')
    if (field.joinTable) {
      console.warn('The `joinTable` is deprecated. Rename to `junctionTable`.')
    }
    const junctionTable = field.junctionTable || field.joinTable
    sqlASTNode.junctionTable = junctionTable
    sqlASTNode.junctionTableAs = namespace.generate('table', junctionTable)
    if (field.sqlJoins) {
      sqlASTNode.sqlJoins = field.sqlJoins
    } else {
      if (typeof field.junctionTableKey === 'string') {
        children.push({
          type: 'column',
          name: field.junctionTableKey,
          fieldName: field.junctionTableKey,
          fromOtherTable: sqlASTNode.junctionTableAs,
          as: namespace.generate('column', field.junctionTableKey)
        })
      } else if (Array.isArray(field.junctionTableKey)) {
        const clumsyName = field.junctionTableKey.join('#') // need a name for this column, smash the individual column names together
        children.push({
          type: 'composite',
          name: field.junctionTableKey,
          fieldName: clumsyName,
          fromOtherTable: sqlASTNode.junctionTableAs,
          as: namespace.generate('column', clumsyName)
        })
      }
      sqlASTNode.junctionBatch = {
        sqlJoin: field.junctionBatch.sqlJoin,
        thisKey: {
          type: 'column',
          name: field.junctionBatch.thisKey,
          fieldName: field.junctionBatch.thisKey,
          fromOtherTable: sqlASTNode.junctionTableAs,
          as: namespace.generate('column', field.junctionBatch.thisKey)
        },
        parentKey: {
          type: 'column',
          name: field.junctionBatch.parentKey,
          fieldName: field.junctionBatch.parentKey,
          as: namespace.generate('column', field.junctionBatch.parentKey)
        }
      }
    }
  }
  else if (field.sqlBatch) {
    sqlASTNode.sqlBatch = {
      thisKey: {
        type: 'column',
        name: field.sqlBatch.thisKey,
        fieldName: field.sqlBatch.thisKey,
        as: namespace.generate('column', field.sqlBatch.thisKey)
      },
      parentKey: {
        type: 'column',
        name: field.sqlBatch.parentKey,
        fieldName: field.sqlBatch.parentKey,
        as: namespace.generate('column', field.sqlBatch.parentKey)
      },
    }
  }

  handleUniqueKey(config, children, namespace)

  if (sqlASTNode.paginate) {
    handleColumnsRequiredForPagination(sqlASTNode, namespace)
  }

  if (queryASTNode.selectionSet) {
    handleSelections(children, queryASTNode.selectionSet.selections, gqlType, fragments, variables, namespace, depth, options)
  }
}

// the selections could be several types, recursively handle each type here
function handleSelections(children, selections, gqlType, fragments, variables, namespace, depth, options) {
  for (let selection of selections) {
    // we need to figure out what kind of selection this is
    switch (selection.kind) {
    // if its another field, recurse through that
    case 'Field':
      const newNode = {}
      children.push(newNode)
      getGraphQLType(selection, gqlType, newNode, fragments, variables, namespace, depth + 1, options)
      break
    // if its an inline fragment, it has some fields and we gotta recurse thru all them
    case 'InlineFragment':
      {
        // check to make sure the type of this fragment (or one of the interfaces it implements) matches the type being queried
        const selectionNameOfType = selection.typeCondition.name.value
        const sameType = selectionNameOfType === gqlType.name
        const interfaceType = gqlType._interfaces.map(iface => iface.name).indexOf(selectionNameOfType) >= 0
        if (sameType || interfaceType) {
          handleSelections(children, selection.selectionSet.selections, gqlType, fragments, variables, namespace, depth + 1, options)
        }
      }
      break
    // if its a named fragment, we need to grab the fragment definition by its name and recurse over those fields
    case 'FragmentSpread':
      {
        const fragmentName = selection.name.value
        const fragment = fragments[fragmentName]
        // make sure fragment type (or one of the interfaces it implements) matches the type being queried
        const fragmentNameOfType = fragment.typeCondition.name.value
        const sameType = fragmentNameOfType === gqlType.name
        const interfaceType = gqlType._interfaces.map(iface => iface.name).indexOf(fragmentNameOfType) >= 0
        if (sameType || interfaceType) {
          handleSelections(children, fragment.selectionSet.selections, gqlType, fragments, variables, namespace, depth + 1, options)
        }
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
      if (sqlASTNode.junctionTable) {
        newChild.fromOtherTable = sqlASTNode.junctionTableAs
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
    if (sqlASTNode.junctionTable) {
      newChild.fromOtherTable = sqlASTNode.junctionTableAs
    }
    sqlASTNode.children.push(newChild)
  }
}

function stripRelayConnection(field, queryASTNode, fragments) {
  // get the GraphQL Type inside the list of edges inside the Node from the schema definition
  const gqlType = field.type._fields.edges.type.ofType._fields.node.type
  // let's remember those arguments on the connection
  const args = queryASTNode.arguments
  // and then find the fields being selected on the underlying type, also buried within edges and Node
  const edges = spreadFragments(queryASTNode.selectionSet.selections, fragments, field.type.name)
    .find(selection => selection.name.value === 'edges')
  if (edges) {
    queryASTNode = spreadFragments(edges.selectionSet.selections, fragments, field.type.name)
      .find(selection => selection.name.value === 'node') || {}
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
  const children = sqlAST.children || []

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

function parseArgValue(value, variableValues) {
  if (value.kind === 'Variable') {
    const variableName = value.name.value
    return variableValues[variableName]
  }
  
  switch(value.kind) {
  case 'IntValue':
    return parseInt(value.value)
  case 'FloatValue':
    return parseFloat(value.value)
  case 'ListValue':
    return value.values.map(value => parseArgValue(value, variableValues))
  default:
    return value.value
  }
}

function getSortColumns(field, sqlASTNode) {
  if (field.sortKey) {
    if (typeof field.sortKey === 'function') {
      sqlASTNode.sortKey = field.sortKey(sqlASTNode.args)
    } else {
      sqlASTNode.sortKey = field.sortKey
    }
  } else if (field.orderBy) {
    if (typeof field.orderBy === 'function') {
      sqlASTNode.orderBy = field.orderBy(sqlASTNode.args)
    } else {
      sqlASTNode.orderBy = field.orderBy
    }
  }
}

function spreadFragments(selections, fragments, typeName) {
  return flatMap(selections, selection => {
    switch(selection.kind) {
    case 'FragmentSpread':
      const fragmentName = selection.name.value
      const fragment = fragments[fragmentName]
      return spreadFragments(fragment.selectionSet.selections, fragments, typeName)
    case 'InlineFragment':
      if (selection.typeCondition.name.value === typeName) {
        return spreadFragments(selection.selectionSet.selections, fragments, typeName)
      } else {
        return []
      }
    default:
      return selection
    }
  })
}

