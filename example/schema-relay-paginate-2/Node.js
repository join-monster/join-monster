import {
  nodeDefinitions,
  fromGlobalId
} from 'graphql-relay'

import joinMonster from '../../src/index'
const options = {
  minify: process.env.MINIFY == 1,
  dialect: process.env.PG_URL ? 'pg' : 'standard'
}

import knex from './database'

const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId, context, resolveInfo) => {
    const { type, id } = fromGlobalId(globalId)
    return joinMonster.getNode(type, resolveInfo, context, id,
      sql => {
        if (context) {
          // makes the SQL query available in the GUI. do NOT do such a thing in production
          context.set('X-SQL-Preview', sql.replace(/\n/g, '%0A'))
        }
        return knex.raw(sql)
      },
      options
    )
  },
  obj => obj.__type__
)

export { nodeInterface, nodeField }

