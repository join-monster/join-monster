import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import { connectionArgs } from 'graphql-relay'

import knex from './database'
import { User, UserConnection } from './User'
import Sponsor from './Sponsor'
import { nodeField } from './Node'

import joinMonster from '../../src/index'
const options = {
  minify: process.env.MINIFY == 1,
  dialect: process.env.PG_URL ? 'pg' : 'standard'
}

function dbCall(sql, context) {
  if (context) {
    context.set('X-SQL-Preview', context.response.get('X-SQL-Preview') + '%0A%0A' + sql.replace(/\n/g, '%0A'))
  }
  return knex.raw(sql)
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
      sqlPaginate: true,
      sortKey: {
        order: 'asc',
        key: 'id'
      },
      where: (table, args) => {
        // this is naughty. do not allow un-escaped GraphQLString inputs into the WHERE clause...
        if (args.search) return `(${table}.first_name ilike '%${args.search}%' OR ${table}.last_name ilike '%${args.search}%')`
      },
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, context, sql => dbCall(sql, context), options)
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
        return joinMonster(resolveInfo, context, sql => dbCall(sql, context), options)
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

