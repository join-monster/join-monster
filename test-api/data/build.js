const assert = require('assert')
require('dotenv-expand')(require('dotenv').config())

assert(
  process.env.MYSQL_URL,
  'Environment variable MYSQL_URL must be defined, e.g. "mysql://user:pass@localhost/"'
)
assert(
  process.env.PG_URL,
  'Environment variable PG_URL must be defined, e.g. "postgres://user:pass@localhost/"'
)
;(async () => {
  //console.log('building oracle')
  //await require('./setup/test1')('oracle')
  //await require('./setup/test2')('oracle')

  console.log('building sqlite3')
  await require('./setup/test1')('sqlite3')
  await require('./setup/demo')('sqlite3')

  console.log('building mysql')
  await require('./setup/test1')('mysql')
  await require('./setup/test2')('mysql')

  console.log('building postgres')
  await require('./setup/test1')('pg')
  await require('./setup/test2')('pg')
  await require('./setup/demo')('pg')
})().catch(err => {
  console.error(err)
  process.exit(1)
})
