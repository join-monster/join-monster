import path from 'path'
import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLInt
} from 'graphql'

const dataFilePath = path.join(__dirname, '../data/data.sl3')
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: dataFilePath
  }
})

import joinMonster from '../../dist/index'
import User from './User'

export default new GraphQLObjectType({
  description: 'global query object',
  name: 'Query',
  fields: () => ({
    users: {
      type: new GraphQLList(User),
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
          return knex.raw(sql)
        })
      }
    }
  })
})
