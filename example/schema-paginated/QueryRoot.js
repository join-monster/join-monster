import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import {
  connectionArgs,
  connectionFromArray
} from 'graphql-relay'

import knex from './database'
import { User, UserConnection } from './User'
import Sponsor from './Sponsor'
import { nodeField } from './Node'

import joinMonster from '../../src/index'
import dbCall from '../data/fetch'
const options = {
  minify: process.env.MINIFY == 1,
  dialect: process.env.PG_URL ? 'pg' : 'standard'
}

export default new GraphQLObjectType({
  description: 'global query object',
  name: 'Query',
  fields: () => ({
    version: {
      type: GraphQLString,
      resolve: () => joinMonster.version
    },
    node: nodeField,
    users: {
      type: UserConnection,
      args: {
        ...connectionArgs,
        search: { type: GraphQLString }
      },
      sqlPaginate: !!process.env.PAGINATE,
      ...process.env.PAGINATE === 'offset' ?
        { orderBy: 'id' } :
        process.env.PAGINATE === 'keyset' ?
          { sortKey:
            { order: 'asc',
              key: 'id' } } :
        {},
      where: (table, args) => {
        // this is naughty. do not allow un-escaped GraphQLString inputs into the WHERE clause...
        if (args.search) return `(${table}.first_name ilike '%${args.search}%' OR ${table}.last_name ilike '%${args.search}%')`
      },
      resolve: async (parent, args, context, resolveInfo) => {
        const data = await joinMonster(resolveInfo, context, sql => dbCall(sql, knex, context), options)
        return process.env.PAGINATE ? data : connectionFromArray(data, args)
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

