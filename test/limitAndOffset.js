import test from 'ava'
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLList, GraphQLInt } from 'graphql'
import { errCheck } from './_util'

import knex from '../test-api/data/database'
import dbCall from '../test-api/data/fetch'

import User from '../test-api/schema-basic/User'

import mysqlModule from '../src/stringifiers/dialects/mysql'
import oracleModule from '../src/stringifiers/dialects/oracle'
import pgModule from '../src/stringifiers/dialects/pg'
import sqlite3Module from '../src/stringifiers/dialects/sqlite3'

import joinMonster from '../src/index'

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

const schema = new GraphQLSchema({
  description: 'a test schema',
  query: new GraphQLObjectType({
    description: 'global query object',
    name: 'Query',
    fields: () => ({
      users: {
        type: new GraphQLList(User),
        args: {
          limit: { type: GraphQLInt },
          offset: { type: GraphQLInt }
        },
        extensions: {
          joinMonster: {
            orderBy: 'id',
            limit: (args) => args.limit,
            offset: (args) => args.offset ?? 0
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
      }
    })
  })
})

test('it should allow specifying a limit', async t => {
  const source = `{
    users(limit: 1) {
      fullName
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    users: [
      {
        fullName: 'andrew carlson',
      }
    ]
  }
  t.deepEqual(expect, data)
})


test('it should allow specifying a limit and an offset', async t => {
  const source = `{
    users(limit: 1, offset: 1) {
      fullName
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    users: [
      {
        fullName: 'matt elder',
      }
    ]
  }
  t.deepEqual(expect, data)
})
