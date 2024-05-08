GraphsiQL
========

*/ˈɡrafsək(ə)l/* A custom version of GraphiQL for [Join Monster](https://github.com/join-monster/join-monster).
[Try the live demo](https://join-monster-demo.onrender.com/graphql).


![graphsiql](../../docs/img/graphsiql.png)


### Usage

```javascript
import express from 'express'
import path from 'path'

const app = express()

// Copy the index.html to your project and serve it
// Assuming your endpoint in /graphql and port is 3000, if not change accordingly
app.get('/graphql', (req, res) => {
  res.sendFile(path.join(__dirname, 'graphsiql', 'index.html'))
})

app.listen(3000, () => console.log('server listening at http://localhost:3000/graphql'))
```

#### How do I get the SQL to appear in the bottom-right-hand window?
 
This window looks for a specific **header** in the HTTP response. Just set `x-sql-preview` to the SQL you want to display.  
Make sure to URI encode characters that cannot be in a header, such as newlines.

```javascript
resolve: (parent, args, context, resolveInfo) => {
  return joinMonster(
    resolveInfo,
    context,
    (sql, done) => {
      if (context?.res) {
        context.res.set(
          'X-SQL-Preview',
          btoa(sql)
        )
      }
      return knex.raw(sql)
    }
  )
}
```