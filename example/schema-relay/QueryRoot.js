import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt
} from 'graphql'

import knex from './database'
import joinMonster from '../../src/index'
import User from './User'
import Sponsor from './Sponsor'
import { getNode } from './Node'

export default new GraphQLObjectType({
  description: 'global query object',
  name: 'Query',
  fields: () => ({
    version: {
      type: GraphQLString,
      resolve: () => joinMonster.version
    },
    node: getNode().nodeField,
    users: {
      type: new GraphQLList(User),
      resolve: (parent, args, context, ast) => {
        return joinMonster(ast, context, sql => {
          // place the SQL query in the response headers. ONLY for debugging. Don't do this in production
          if (context) {
            context.set('X-SQL-Preview', sql.replace(/\n/g, '%0A'))
          }
          return knex.raw(sql)
        })
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
      resolve: (parent, args, context, ast) => {
        return joinMonster(ast, context, sql => {
          if (context) {
            context.set('X-SQL-Preview', sql.replace(/\n/g, '%0A'))
          }
          return knex.raw(sql)
        })
      }
    },
    sponsors: {
      type: new GraphQLList(Sponsor),
      resolve: (parent, args, context, ast) => {
        // use the callback version this time
        return joinMonster(ast, context, (sql, done) => {
          knex.raw(sql)
          .then(data => done(null, data))
          .catch(done)
        })
      }
    }
  })
})
