import path from 'path'
import assert from 'assert'

const connection = process.env.NODE_ENV !== 'test' ?
  pgUrl('demo') :
  pgUrl('test3')

export default require('knex')({
  client: 'pg',
  connection,
  useNullAsDefault: true
})

function pgUrl(dbName) {
  assert(process.env.PG_URL, 'Environment variable PG_URL must be defined, e.g. "postgres://user:pass@localhost/"')
  return process.env.PG_URL + dbName
}

