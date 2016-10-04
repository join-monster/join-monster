import {
  nodeDefinitions,
  fromGlobalId
} from 'graphql-relay'

import knex from './database'

function getTypes() {
  const types = {}
  for (let type of [ 'Comment', 'Post', 'User' ]) {
    types[type] = require(`./${type}`).default
  }
  return types
}

const { nodeInterface, nodeField } = nodeDefinitions(
  globalId => {
    const { type, id } = fromGlobalId(globalId)
    const types = getTypes()
    const config = types[type]._typeConfig
    return (
      knex(config.sqlTable).first().where({ id })
      .then(obj => {
        obj._type = type
        return obj
      })
    )
  },
  obj => {
    return getTypes()[obj._type]
  }
)

export function getNode() {
  return { nodeInterface, nodeField }
}
