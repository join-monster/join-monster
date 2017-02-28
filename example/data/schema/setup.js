const url = require('url')
const { execSync } = require('child_process')
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const Promise = require('bluebird')

module.exports = function(db, name) {

  if (db === 'oracle') {
    console.log('building oracle')
    const [ password, connectString ] = process.env.ORACLE_URL.split('@')
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
    return Promise.mapSeries(schema.filter(i => i), stmt => {
      console.log(stmt.trim())
      return knex.raw(stmt.trim())
    })
    .then(() => knex)
    .catch(err => {
      console.error(err)
      knex.destroy()
      process.exit(1)
    })
  }

  if (db === 'pg') {
    assert(process.env.PG_URL, 'Must provide environment variable PG_URL, e.g. "postgres://user:pass@localhost/"')
    const out = execSync(`psql ${process.env.PG_URL + name} < ${__dirname}/pg.sql`)
    if (out.toString()) {
      console.log(out.toString())
    }
    return require('knex')({
      client: 'pg',
      connection: process.env.PG_URL + name
    })
  }

  if (db === 'mysql') {
    assert(process.env.MYSQL_URL, 'Must provide environment variable MYSQL_URL, e.g. "mysql://user:pass@localhost/"')
    const args = parseConnectionStr(process.env.MYSQL_URL + name)
    const out = execSync(`cat ${__dirname}/mysql.sql | mysql ${args}`)
    if (out.toString()) {
      console.log(out.toString())
    }
    return require('knex')({
      client: 'mysql',
      connection: process.env.MYSQL_URL + name
    })
  }

  if (db === 'sqlite3') {
    const out = execSync(`/bin/cat ${__dirname}/sqlite3.sql | sqlite3 ${__dirname}/../db/${name}-data.sl3`)
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

function parseConnectionStr(dbUri) {
  const parsed = url.parse(dbUri)
  let args = ''
  if (parsed.auth) {
    const [ user, password ] = parsed.auth.split(':')
    args += '--user=' + user
    if (password) {
      args += ' --password=' + password
    }
  }
  if (parsed.hostname) {
    args += ' --host=' + parsed.hostname
  }
  if (parsed.port) {
    args += ' --port=' + parsed.port
  }
  if (parsed.pathname) {
    args += ` ${parsed.pathname.slice(1)}`
  }
  return args
}

