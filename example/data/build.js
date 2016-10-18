const { execSync } = require('child_process')
const assert = require('assert')

assert(process.env.PG_URL, 'Environment variable PG_URL must be defined, e.g. "postgres://user:pass@localhost/"')

;(async () => {
  console.log('building sqlite3')
  await require('./setup/test1')()
  await require('./setup/test2')()
  await require('./setup/demo')()

  console.log('building postgres')
  process.env.DB = 'PG'

  await require('./setup/test1')()
  await require('./setup/test2')()
  await require('./setup/demo')()

  console.log('restoring dump...')
  const out = execSync(`psql ${process.env.PG_URL}test3 < ${__dirname}/setup/test3-dump.sql`)
  if (out.toString()) {
    console.log(out.toString())
  }
})()
.catch(err => {
  console.error(err)
  throw err
})

