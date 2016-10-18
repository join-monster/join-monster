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
