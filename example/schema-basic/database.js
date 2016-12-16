import path from 'path'
import assert from 'assert'

const dbType = process.env.DB

const connection = process.env.NODE_ENV !== 'test' ?
  { filename: path.join(__dirname, '../data/db/test1-data.sl3') } :
  dbType === 'PG' ?
    pgUrl('test1') :
    dbType === 'MYSQL' ?
      mysqlUrl('test1') :
      { filename: path.join(__dirname, '../data/db/test1-data.sl3') }

let client = 'sqlite3'
if (dbType === 'PG') {
  client = 'pg'
} else if (dbType === 'MYSQL') {
  client = 'mysql'
}

console.log('connection to', { client, connection })
export default require('knex')({
  client,
  connection,
  useNullAsDefault: true
})

function pgUrl(dbName) {
  assert(process.env.PG_URL, 'Environment variable PG_URL must be defined, e.g. "postgres://user:pass@localhost/"')
  return process.env.PG_URL + dbName
}

function mysqlUrl(dbName) {
  assert(process.env.MYSQL_URL, 'Environment variable MYSQL_URL must be defined, e.g. "mysql//user:pass@localhost/"')
  return process.env.MYSQL_URL + dbName
}
