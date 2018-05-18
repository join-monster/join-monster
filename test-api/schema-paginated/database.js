import getDatabaseConnection from '../database'

const dbName = process.env.PAGINATE ? 'test2' : 'test1'

const knex = getDatabaseConnection(dbName)

export default knex
