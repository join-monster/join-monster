require('dotenv-expand')(require('dotenv').config())
import assert from 'assert'
import path from 'path'

const dbType = process.env.DB

const connection =
  process.env.NODE_ENV !== 'test'
    ? pgUrl(process.env.PAGINATE ? 'test2' : 'test1')
    : dbType === 'PG'
    ? pgUrl(process.env.PAGINATE ? 'test2' : 'test1')
    : dbType === 'MYSQL'
    ? mysqlUrl(process.env.PAGINATE ? 'test2' : 'test1')
    : dbType === 'ORACLE'
    ? oracleUrl(process.env.PAGINATE ? 'test2' : 'test1')
    : { filename: path.join(__dirname, '../data/db/test1-data.sl3') }

let client = 'sqlite3'
if (process.env.NODE_ENV !== 'test') {
  client = 'pg'
} else if (dbType === 'PG') {
  client = 'pg'
} else if (dbType === 'MYSQL') {
  client = 'mysql'
} else if (dbType === 'ORACLE') {
  client = 'oracledb'
}

export default require('knex')({
  client,
  connection,
  useNullAsDefault: true
})

function pgUrl(dbName) {
  assert(
    process.env.PG_URL,
    'Environment variable PG_URL must be defined, e.g. "postgres://user:pass@localhost/"'
  )
  return process.env.PG_URL + dbName
}

function mysqlUrl(dbName) {
  assert(
    process.env.MYSQL_URL,
    'Environment variable MYSQL_URL must be defined, e.g. "mysql//user:pass@localhost/"'
  )
  return process.env.MYSQL_URL + dbName
}

function oracleUrl(dbName) {
  assert(
    process.env.MYSQL_URL,
    'Environment variable ORACLE_URL must be defined, e.g. "pass@localhost:port/sid"'
  )
  const [password, connectString] = process.env.ORACLE_URL.split('@')
  return { user: dbName, password, connectString, stmtCacheSize: 0 }
}
