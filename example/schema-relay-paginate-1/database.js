import assert from 'assert'

const connection = process.env.NODE_ENV !== 'test' ?
  pgUrl('demo') :
  pgUrl('test3')

const client = 'pg'

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

