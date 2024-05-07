
import path from 'path'
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors'

import { createHandler } from 'graphql-http/lib/use/express';

// module we created that lets you serve a custom build of GraphiQL
import graphiql from 'express-custom-graphiql'

import schemaBasic from './schema-basic/index'
import schemaRelay from './schema-paginated/index'

const app = express();

app.use(bodyParser.json())
app.use(cors())

app.get(
  '/graphql',
  graphiql({
    css: '/graphiql.css',
    js: '/graphiql.js'
  })
)

app.get(
  '/graphql-relay',
  graphiql({
    url: '/graphql-relay',
    css: '/graphiql.css',
    js: '/graphiql.js'
  })
)

app.post(
  '/graphql',
  createHandler({
    schema: schemaBasic,
    formatError: e => {
      console.error(e)
      return e
    }
  }))

app.post(
  '/graphql-relay',
  createHandler({
    schema: schemaRelay,
    formatError: e => {
      console.error(e)
      return e
    }
  })
)

// serve the custom build of GraphiQL
app.use(express.static(path.join(__dirname, '../node_modules/graphsiql')))

app.listen(3000, () =>
  console.log(
    'server listening at http://localhost:3000/graphql and http://localhost:3000/graphql-relay'
  )
)
