const assert = require('assert')
const fs = require('fs')
const path = require('path')
const Promise = require('bluebird')

module.exports = async function(db, name) {
  switch (db) {
  case 'oracle': {
    const { ORACLE_URL } = process.env
    assert(ORACLE_URL, 'Must provide environment variable ORACLE_URL, e.g. "pass@localhost/"')
    const [ password, connectString ] = ORACLE_URL.split('@')
    const knex = require('knex')({
      client: 'oracledb',
      connection: {
        user: name,
        password,
        connectString,
        stmtCacheSize: 0
      }
    })
    await runStatementsFromFile(knex, 'oracle.sql', /\r?\n\r?\n/)
    return knex
  }

  case 'pg': {
    const { PG_URL } = process.env
    assert(PG_URL, 'Must provide environment variable PG_URL, e.g. "postgres://user:pass@localhost/"')
    const knex = require('knex')({
      client: 'pg',
      connection: PG_URL + name
    })
    await runStatementsFromFile(knex, 'pg.sql')
    return knex
  }

  case 'mysql': {
    const { MYSQL_URL } = process.env
    assert(MYSQL_URL, 'Must provide environment variable MYSQL_URL, e.g. "mysql://user:pass@localhost/"')
    const knex = require('knex')({
      client: 'mysql',
      connection: MYSQL_URL + name
    })
    await runStatementsFromFile(knex, 'mysql.sql')
    return knex
  }

  case 'sqlite3': {
    const knex = require('knex')({
      client: 'sqlite3',
      connection: {
        filename: __dirname + `/../db/${name}-data.sl3`
      },
      useNullAsDefault: true
    })
    await runStatementsFromFile(knex, 'sqlite3.sql')
    return knex
  }

  default:
    throw new Error(`do not recognize database "${db}"`)
  }
}

async function runStatementsFromFile(knex, filename, split = ';') {
  const statements = fs
    .readFileSync(path.join(__dirname, filename), 'utf8')
    .toString()
    .split(/;/)
  try {
    await Promise.mapSeries(statements.map(stmt => stmt.trim()).filter(stmt => !!stmt), stmt => {
      console.log(stmt)
      return knex.raw(stmt)
    })
    return knex
  } catch (err) {
    console.error(err)
    knex.destroy()
    process.exit(1)
  }
}
