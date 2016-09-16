import path from 'path'
import {
  GraphQLObjectType,
  GraphQLList
} from 'graphql'

const dataFilePath = path.join(__dirname, '../data.sl3')
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
      resolve: (parent, args, context, ast) => {
        return joinMonster(ast, sql => {
          return knex.raw(sql)
        })
      }
    }
  })
})
