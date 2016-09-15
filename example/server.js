import koa from 'koa'
import mount from 'koa-mount'
import graphqlHTTP from 'koa-graphql'

import schema from './schema/index'

const app = koa()

app.use(mount('/graphql', graphqlHTTP({
  schema,
  graphiql: true
})))

app.listen(3000, () => console.log('server listening at http://localhost:3000/graphql'))
