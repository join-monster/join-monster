const { execSync } = require('child_process')

module.exports = function(name) {
  execSync(`/bin/cat ${__dirname}/schema.sql | sqlite3 ${__dirname}/${name}-data.sl3`)

  return require('knex')({
    client: 'sqlite3',
    connection: {
      filename: __dirname + `/${name}-data.sl3`
    },
    useNullAsDefault: true
  })
}
