import path from 'path'

const dataFilePath = path.join(__dirname, '../data', process.env.NODE_ENV === 'test' ? 'test2-data.sl3' : 'demo-data.sl3')
export default require('knex')({
  client: 'sqlite3',
  connection: {
    filename: dataFilePath
  },
  useNullAsDefault: true
})
