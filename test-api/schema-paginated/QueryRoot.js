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

import knex from '../data/database'
import dbCall from '../data/fetch'

import { User, UserConnection } from './User'
import { Post } from './Post'
import Sponsor from './Sponsor'
import { nodeField } from './Node'
import ContextPost from './ContextPost'

import joinMonster from '../../src/index'
import { q } from '../shared'

const { PAGINATE, DB } = process.env

const options = {
  minify: process.env.MINIFY == 1,
  aliasPrefix: process.env.ALIAS_PREFIX
}
if (knex.client.config.client === 'mysql') {
  options.dialect = PAGINATE ? 'mysql8' : 'mysql'
} else if (knex.client.config.client === 'pg') {
  options.dialect = 'pg'
} else if (knex.client.config.client === 'oracledb') {
  options.dialect = 'oracle'
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
    dialect: {
      type: GraphQLString,
      resolve: () => options.dialect
    },
    node: nodeField,
    users: {
      type: UserConnection,
      args: {
        search: { type: GraphQLString },
        ...(PAGINATE === 'offset' ? forwardConnectionArgs : connectionArgs)
      },
      extensions: {
        joinMonster: {
          sqlPageLimit: 100,
          sqlPaginate: !!PAGINATE,
          ...(PAGINATE === 'offset' ?
              { orderBy: 'id' }
            : PAGINATE === 'keyset' ?
              {
                sortKey: {
                  order: 'asc',
                  key: 'id'
                }
              }
              : {}),
          where: (table, args) => {
            // this is naughty. do not allow un-escaped GraphQLString inputs into the WHERE clause...
            if (args.search)
              return `(lower(${table}.${q('first_name', DB)}) LIKE lower('%${
                args.search
              }%') OR lower(${table}.${q('last_name', DB)}) LIKE lower('%${
                args.search
              }%'))`
          }
        }
      },
      resolve: async (parent, args, context, resolveInfo) => {
        const data = await joinMonster(
          resolveInfo,
          context,
          sql => dbCall(sql, knex, context),
          options
        )
        return PAGINATE ? data : connectionFromArray(data, args)
      }
    },
    usersFirst2: {
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          limit: 2,
          orderBy: 'id'
        }
      },
      resolve: (parent, args, context, resolveInfo) => {
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
        }
      },
      extensions: {
        joinMonster: {
          where: (usersTable, args, context) => {
            // eslint-disable-line no-unused-vars
            if (args.id) return `${usersTable}.${q('id', DB)} = ${args.id}`
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
    post: {
      type: Post,
      args: {
        id: {
          description: 'The posts ID number',
          type: GraphQLInt
        }
      },
      extensions: {
        joinMonster: {
          where: (postsTable, args) => {
            // eslint-disable-line no-unused-vars
            if (args.id) return `${postsTable}.${q('id', DB)} = ${args.id}`
          }
        }
      },
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(
          resolveInfo,
          context,
          sql => dbCall(sql, knex, context),
          options
        )
      }
    },
    sponsors: {
      type: new GraphQLList(Sponsor),
      resolve: (parent, args, context, resolveInfo) => {
        // use the callback version this time
        return joinMonster(
          resolveInfo,
          context,
          (sql, done) => {
            knex
              .raw(sql)
              .then(data => done(null, data))
              .catch(done)
          },
          options
        )
      }
    },
    contextPosts: {
      type: new GraphQLList(ContextPost),
      resolve: (parent, args, context, resolveInfo) => {
        // use the callback version this time
        return joinMonster(
          resolveInfo,
          context,
          (sql, done) => {
            knex
              .raw(sql)
              .then(data => done(null, data))
              .catch(done)
          },
          options
        )
      }
    }
  })
})
