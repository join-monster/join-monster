import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import knex from '../data/database'
import dbCall from '../data/fetch'

import User from './User'
import Sponsor from './Sponsor'
import { fromBase64, q } from '../shared'

import mysqlModule from '../../src/stringifiers/dialects/mysql'
import oracleModule from '../../src/stringifiers/dialects/oracle'
import pgModule from '../../src/stringifiers/dialects/pg'
import sqlite3Module from '../../src/stringifiers/dialects/sqlite3'

import joinMonster from '../../src/index'

const { MINIFY, ALIAS_PREFIX, DB } = process.env
const options = {
  minify: MINIFY == 1,
  aliasPrefix: ALIAS_PREFIX
}
if (knex.client.config.client === 'mysql') {
  options.dialectModule = mysqlModule
} else if (knex.client.config.client === 'pg') {
  options.dialectModule = pgModule
} else if (knex.client.config.client === 'oracledb') {
  options.dialectModule = oracleModule
} else if (knex.client.config.client === 'sqlite3') {
  options.dialectModule = sqlite3Module
}

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
      resolve: () =>
        knex.client.config.client +
        ' ' +
        JSON.stringify(knex.client.config.connection).replace(/"/g, '  ')
    },
    users: {
      type: new GraphQLList(User),
      args: {
        ids: { type: new GraphQLList(GraphQLInt) }
      },
      extensions: {
        joinMonster: {
          where: (table, args) =>
            args.ids ? `${table}.id IN (${args.ids.join(',')})` : null,
          orderBy: 'id'
        }
      },
      resolve: async (parent, args, context, resolveInfo) => {
        return joinMonster(
          resolveInfo,
          context,
          sql => dbCall(sql, knex, context),
          options
        )
      }
    },
    user: {
      type: User,
      args: {
        id: {
          description: 'The users ID number',
          type: GraphQLInt
        },
        idEncoded: {
          description: 'The users encoded ID number',
          type: GraphQLString
        },
        idAsync: {
          description: 'The users ID number, with an async where function',
          type: GraphQLInt
        }
      },
      extensions: {
        joinMonster: {
          where: (usersTable, args, context) => {
            // eslint-disable-line no-unused-vars
            if (args.id) return `${usersTable}.${q('id', DB)} = ${args.id}`
            if (args.idEncoded)
              return `${usersTable}.${q('id', DB)} = ${fromBase64(
                args.idEncoded
              )}`
            if (args.idAsync)
              return Promise.resolve(
                `${usersTable}.${q('id', DB)} = ${args.idAsync}`
              )
          }
        }
      },
      resolve: (parent, args, context, resolveInfo) => {
         // Add a hook to capture the SQL
    
         const sqlLogger = sql => {
         // Store it in the context for the test to access
            if (context && Object.prototype.hasOwnProperty.call(context, 'capturedSql')) {
               context.capturedSql = sql
            }
            return dbCall(sql, knex, context)
         }

         return joinMonster(
            resolveInfo,
            context,
            sqlLogger,
            options
        )
      }
    },
    sponsors: {
      type: new GraphQLList(Sponsor),
      args: {
        filterLegless: {
          description: 'Exclude sponsors with no leg info',
          type: GraphQLBoolean
        }
      },
      extensions: {
        joinMonster: {
          where: (sponsorsTable, args, context) => {
            // eslint-disable-line no-unused-vars
            if (args.filterLegless)
              return `${sponsorsTable}.${q('num_legs', DB)} IS NULL`
          } 
        }
      },
      resolve: (parent, args, context, resolveInfo) => {
        // use the callback version this time
        return joinMonster(
          resolveInfo,
          context,
          (sql, done) => {
            knex
              .raw(sql)
              .then(result => {
                if (options.dialectModule.name === 'mysql') {
                  done(null, result[0])
                } else {
                  done(null, result)
                }
              })
              .catch(done)
          },
          options
        )
      }
    }
  })
})
