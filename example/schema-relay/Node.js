import {
  nodeDefinitions,
  fromGlobalId
} from 'graphql-relay'

import joinMonster from '../../src/index'

import knex from './database'

const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId, context, ast) => {
    const { type, id } = fromGlobalId(globalId)
    return joinMonster.getNode(type, ast, context,
      table => `${table}.id = ${id}`,
      sql => knex.raw(sql)
    )
  },
  obj => obj.__type__
)

export { nodeInterface, nodeField }

