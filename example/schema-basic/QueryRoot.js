import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql'

import knex from './database'
import dbCall from '../data/fetch'

import User from './User'
import Sponsor from './Sponsor'
import { fromBase64 } from './utils'

import joinMonster from '../../src/index'
const options = {
  minify: process.env.MINIFY == 1
}
if (knex.client.config.client === 'mysql') {
  options.dialect = 'mysql'
} else if (knex.client.config.client === 'pg') {
  options.dialect = 'pg'
}


export default new GraphQLObjectType({
  description: 'global query object',
  name: 'Query',
  fields: () => ({
    version: {
      type: GraphQLString,
      resolve: () => joinMonster.version
    },
    users: {
      type: new GraphQLList(User),
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, context, sql => dbCall(sql, knex, context), options)
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
      where: (usersTable, args, context) => { // eslint-disable-line no-unused-vars
        if (args.id) return `${usersTable}.id = ${args.id}`
        if (args.idEncoded) return `${usersTable}.id = ${fromBase64(args.idEncoded)}`
        if (args.idAsync) return Promise.resolve(`${usersTable}.id = ${args.idAsync}`)
      },
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, context, sql => dbCall(sql, knex, context), options)
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
      where: (sponsorsTable, args, context) => { // eslint-disable-line no-unused-vars
        if (args.filterLegless) return `${sponsorsTable}.num_legs IS NULL`
      },
      resolve: (parent, args, context, resolveInfo) => {
        // use the callback version this time
        return joinMonster(resolveInfo, context, (sql, done) => {
          knex.raw(sql)
          .then(result => {
            if (options.dialect === 'mysql') {
              done(null, result[0])
            } else {
              done(null, result)
            }
          })
          .catch(done)
        }, options)
      }
    }
  })
})

