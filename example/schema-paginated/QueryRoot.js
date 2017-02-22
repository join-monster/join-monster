import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import {
  connectionArgs,
  forwardConnectionArgs,
  connectionFromArray
} from 'graphql-relay'

import knex from './database'
import { User, UserConnection } from './User'
import Sponsor from './Sponsor'
import { nodeField } from './Node'

import joinMonster from '../../src/index'
import dbCall from '../data/fetch'
const options = {
  minify: process.env.MINIFY == 1
}
if (knex.client.config.client === 'mysql') {
  options.dialect = 'mysql'
} else if (knex.client.config.client === 'pg') {
  options.dialect = 'pg'
}

const { PAGINATE } = process.env

export default new GraphQLObjectType({
  description: 'global query object',
  name: 'Query',
  fields: () => ({
    version: {
      type: GraphQLString,
      resolve: () => joinMonster.version
    },
    database: {
      type: GraphQLString,
      resolve: () => knex.client.config.client + ' ' + JSON.stringify(knex.client.config.connection).replace(/"/g, '  ')
    },
    node: nodeField,
    users: {
      type: UserConnection,
      args: {
        search: { type: GraphQLString },
        ...PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs
      },
      sqlPaginate: !!PAGINATE,
      ... do {
        if (PAGINATE === 'offset') {
          ({ orderBy: 'id' })
        } else if (PAGINATE === 'keyset') {
          ({
            sortKey: {
              order: 'asc',
              key: 'id'
            }
          })
        }
      },
      where: (table, args) => {
        // this is naughty. do not allow un-escaped GraphQLString inputs into the WHERE clause...
        if (args.search) return `(${table}.first_name ilike '%${args.search}%' OR ${table}.last_name ilike '%${args.search}%')`
      },
      resolve: async (parent, args, context, resolveInfo) => {
        const data = await joinMonster(resolveInfo, context, sql => dbCall(sql, knex, context), options)
        return PAGINATE ? data : connectionFromArray(data, args)
      }
    },
    user: {
      type: User,
      args: {
        id: {
          description: 'The users ID number',
          type: GraphQLInt
        }
      },
      where: (usersTable, args, context) => { // eslint-disable-line no-unused-vars
        if (args.id) return `${usersTable}.id = ${args.id}`
      },
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, context, sql => dbCall(sql, knex, context), options)
      }
    },
    sponsors: {
      type: new GraphQLList(Sponsor),
      resolve: (parent, args, context, resolveInfo) => {
        // use the callback version this time
        return joinMonster(resolveInfo, context, (sql, done) => {
          knex.raw(sql)
          .then(data => done(null, data))
          .catch(done)
        }, options)
      }
    }
  })
})

