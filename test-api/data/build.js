(async() => {
  if (process.argv.length > 2) {
    // First argument is node, second is script
    for (let i = 2; i < process.argv.length; i += 1) {
      switch (process.argv[i]) {
      case 'maria':
      case 'mariadb':
      case 'mysql':
        await buildMysql()
        break
      case 'oracle':
        await buildOracle()
        break
      case 'pg':
      case 'postgres':
        await buildPostgres()
        break
      case 'sqlite':
      case 'sqlite3':
        await buildSqlite()
        break
      default:
        throw new Error(`Unsupported database type: "${process.argv[i]}"`)
      }
    }
  } else {
    await buildMysql()
    await buildPostgres()
    await buildSqlite()
  }
})().catch(err => {
  console.error(err)
  throw err
})


async function buildMysql() {
  console.log('building mysql')
  await require('./setup/test1')('mysql')
  await require('./setup/test2')('mysql')
}

async function buildOracle() {
  console.log('building oracle')
  await require('./setup/test1')('oracle')
  await require('./setup/test2')('oracle')
}

async function buildPostgres() {
  console.log('building postgres')
  await require('./setup/test1')('pg')
  await require('./setup/test2')('pg')
  await require('./setup/demo')('pg')
}

async function buildSqlite() {
  console.log('building sqlite3')
  await require('./setup/test1')('sqlite3')
  await require('./setup/demo')('sqlite3')
}
