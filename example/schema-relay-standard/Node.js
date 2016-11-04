import {
  nodeDefinitions,
  fromGlobalId
} from 'graphql-relay'

import joinMonster from '../../src/index'
const options = {
  minify: process.env.MINIFY == 1
}
if (knex.client.config.client === 'mysql') {
  options.dialect = 'mysql'
} else if (knex.client.config.client === 'pg') {
  options.dialect = 'pg'
}

import knex from './database'

const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId, context, resolveInfo) => {
    const { type, id } = fromGlobalId(globalId)
    return joinMonster.getNode(type, resolveInfo, context,
      table => `${table}.id = ${id}`,
      sql => {
        if (context) {
          context.set('X-SQL-Preview', sql.replace(/\n/g, '%0A'))
        }
        return knex.raw(sql).then(result => {
          if (options.dialect === 'mysql') {
            return result[0]
          }
          return result
        })
      },
      options
    )
  },
  obj => obj.__type__
)

export { nodeInterface, nodeField }

