import path from 'path'
import Koa from 'koa'
import koaRouter from 'koa-router'
import graphqlHTTP from 'koa-graphql'
// module we created that lets you serve a custom build of GraphiQL
import graphiql from 'koa-custom-graphiql'
import koaStatic from 'koa-static'
import cors from 'kcors'

import schemaBasic from './schema-basic/index'
import schemaRelay from './schema-paginated/index'

const app = new Koa()
const router = koaRouter()

app.use(cors())

router.get(
  '/graphql',
  graphiql({
    css: '/graphiql.css',
    js: '/graphiql.js'
  })
)

router.get(
  '/graphql-relay',
  graphiql({
    url: '/graphql-relay',
    css: '/graphiql.css',
    js: '/graphiql.js'
  })
)

router.post(
  '/graphql',
  graphqlHTTP({
    schema: schemaBasic,
    formatError: e => {
      console.error(e)
      return e
    }
  })
)

router.post(
  '/graphql-relay',
  graphqlHTTP({
    schema: schemaRelay,
    formatError: e => {
      console.error(e)
      return e
    }
  })
)

app.use(router.routes())
// serve the custom build of GraphiQL
app.use(koaStatic(path.join(__dirname, '../node_modules/graphsiql')))

app.listen(3000, () =>
  console.log(
    'server listening at http://localhost:3000/graphql and http://localhost:3000/graphql-relay'
  )
)
