const url = require('url')
const { execSync } = require('child_process')
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const Promise = require('bluebird')

module.exports = function(db, name) {
  const { ORACLE_URL, PG_URL, MYSQL_URL } = process.env

  if (db === 'oracle') {
    console.log('building oracle')
    const [password, connectString] = ORACLE_URL.split('@')
    const knex = require('knex')({
      client: 'oracledb',
      connection: {
        user: name,
        password,
        connectString,
        stmtCacheSize: 0
      }
    })

    let schema = fs.readFileSync(path.join(__dirname, 'oracle.sql')).toString()
    schema = schema.split(/\r?\n\r?\n/)
    return Promise.each(
      schema.filter(i => i),
      stmt => knex.raw(stmt.trim())
    )
      .then(() => knex)
      .catch(err => {
        console.error(err)
        knex.destroy()
        process.exit(1)
      })
  }

  if (db === 'pg') {
    assert(
      PG_URL,
      'Must provide environment variable PG_URL, e.g. "postgres://user:pass@localhost/"'
    )
    const out = execSync(`psql ${PG_URL + name} < ${__dirname}/pg.sql`)
    if (out.toString()) {
      console.log(out.toString())
    }
    return require('knex')({
      client: 'pg',
      connection: PG_URL + name
    })
  }

  if (db === 'mysql') {
    assert(
      MYSQL_URL,
      'Must provide environment variable MYSQL_URL, e.g. "mysql://user:pass@localhost/"'
    )
    const knex = require('knex')({
      client: 'mysql',
      connection: MYSQL_URL + name
    })
    const ddl = fs
      .readFileSync(`${__dirname}/mysql.sql`, 'utf8')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => !!stmt)
    for (let stmt of ddl) {
      console.log(stmt)
    }
    return Promise.each(ddl, stmt => knex.raw(stmt)).then(() => knex)
  }

  if (db === 'sqlite3') {
    const out = execSync(
      `/bin/cat ${__dirname}/sqlite3.sql | sqlite3 ${__dirname}/../db/${name}-data.sl3`
    )
    if (out.toString()) {
      console.log(out.toString())
    }

    return require('knex')({
      client: 'sqlite3',
      connection: {
        filename: __dirname + `/../db/${name}-data.sl3`
      },
      useNullAsDefault: true
    })
  }

  throw new Error(`do not recognize database "${db}"`)
}
