
import path from 'path'
import express from 'express'
import cors from 'cors'

import { createHandler } from 'graphql-http/lib/use/express'

import schemaBasic from './schema-basic/index'
import schemaRelay from './schema-paginated/index'

const app = express()

app.use(cors())

app.get('/graphql', (req, res) => {
  res.sendFile(path.join(__dirname, 'graphsiql', 'index.html'))
})

app.get('/graphql-relay', (req, res) => {
  res.sendFile(path.join(__dirname, 'graphsiql', 'index.html'))
})

app.post(
  '/graphql',
  createHandler({
    schema: schemaBasic,
    context: req => req.raw,
    formatError: e => {
      console.error(e)
      return e
    }
  }))

app.post(
  '/graphql-relay',
  createHandler({
    schema: schemaRelay,
    context: req => req.raw,
    formatError: e => {
      console.error(e)
      return e
    }
  })
)

app.listen(3000, () =>
  console.log(
    'server listening at http://localhost:3000/graphql and http://localhost:3000/graphql-relay'
  )
)
