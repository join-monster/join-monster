import {
  nodeDefinitions,
  fromGlobalId
} from 'graphql-relay'

import mariadbModule from '../../src/stringifiers/dialects/mariadb'
import mysqlModule from '../../src/stringifiers/dialects/mysql'
import oracleModule from '../../src/stringifiers/dialects/oracle'
import pgModule from '../../src/stringifiers/dialects/pg'
import sqlite3Module from '../../src/stringifiers/dialects/sqlite3'

import joinMonster from '../../src/index'
const options = {
  minify: process.env.MINIFY == 1
}
const { PAGINATE } = process.env

if (knex.client.config.client === 'mysql') {
  options.dialectModule = PAGINATE ? mariadbModule : mysqlModule
} else if (knex.client.config.client === 'pg') {
  options.dialectModule = pgModule
} else if (knex.client.config.client === 'oracledb') {
  options.dialectModule = oracleModule
} else if (knex.client.config.client === 'sqlite3') {
  options.dialectModule = sqlite3Module
}

import dbCall from '../data/fetch'
import knex from './database'

const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId, context, resolveInfo) => {
    const { type, id } = fromGlobalId(globalId)
    return joinMonster.getNode(type, resolveInfo, context, parseInt(id),
      sql => dbCall(sql, knex, context),
      options
    )
  },
  obj => obj.__type__
)

export { nodeInterface, nodeField }

