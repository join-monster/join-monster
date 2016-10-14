import path from 'path'

export default require('knex')({
  client: 'pg',
  connection: 'postgres://andy:corn@localhost/demo'
})
