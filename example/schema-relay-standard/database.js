import path from 'path'
import assert from 'assert'

const connection = process.env.NODE_ENV !== 'test' ?
  pgUrl('demo') :
  process.env.DB === 'PG' ?
    pgUrl('test2') :
    { filename: path.join(__dirname, '../data/db/test2-data.sl3') }

const client = typeof connection === 'string' ? 'pg' : 'sqlite3'

export default require('knex')({
  client,
  connection,
  useNullAsDefault: true
})

function pgUrl(dbName) {
  assert(process.env.PG_URL, 'Environment variable PG_URL must be defined, e.g. "postgres://user:pass@localhost/"')
  return process.env.PG_URL + dbName
}

