import path from 'path'
import assert from 'assert'

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
    'Environment variable MYSQL_URL must be defined, e.g. "mysql://user:pass@localhost/"'
  )
  return process.env.MYSQL_URL + dbName
}

function oracleUrl(dbName) {
  assert(
    process.env.ORACLE_URL,
    'Environment variable ORACLE_URL must be defined, e.g. "pass@localhost:port/sid"'
  )
  const [ password, connectString ] = process.env.ORACLE_URL.split('@')
  return { user: dbName, password, connectString, stmtCacheSize: 0 }
}

const getDatabaseConnection = dbName => {
  const dbType = process.env.DB

  let client
  let connection
  switch (dbType) {
  case 'PG':
    client = 'pg'
    connection = pgUrl(dbName)
    break
  case 'MARIADB':
  case 'MYSQL':
    client = 'mysql'
    connection = mysqlUrl(dbName)
    break
  case 'ORACLE':
    client = 'oracledb'
    connection = oracleUrl(dbName)
    break
  case 'SQLLITE':
    client = 'sqlite3'
    connection = {
      filename: path.join(__dirname, './data/db/test1-data.sl3')
    }
    break
  default:
    throw new Error(`Unsupported dbType "${dbType}".`)
  }

  console.log('connection to', { client, connection })
  return require('knex')({
    client,
    connection,
    useNullAsDefault: true
  })
}

export default getDatabaseConnection
