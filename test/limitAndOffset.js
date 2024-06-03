import test from 'ava'
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLList, GraphQLInt } from 'graphql'
import { errCheck, getDatabaseOptions } from './_util'

import knex from '../test-api/data/database'
import dbCall from '../test-api/data/fetch'

import User from '../test-api/schema-basic/User'

import joinMonster from '../src/index'

const options = getDatabaseOptions(knex)

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
