const url = require('url')
const { execSync } = require('child_process')
const assert = require('assert')

module.exports = function(name) {
  if (process.env.DB === 'PG') {
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

  if (process.env.DB === 'MYSQL') {
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

