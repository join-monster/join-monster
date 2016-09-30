const knex = require('./schema-setup')('test')

;(async () => {
  await knex.batchInsert('accounts', [
    {
      email_address: 'andrew@stem.is',
      first_name: 'andrew',
      last_name: 'carlson'
    },
    {
      email_address: 'matt@stem.is',
      first_name: 'matt',
      last_name: 'elder'
    }
  ])

  await knex('comments').insert({
    body: 'Wow this is a great post, Matt.',
    post_id: 1,
    author_id: 1
  })

  await knex('posts').insert({
    body: 'If I could marry a programming language, it would be Haskell.',
    author_id: 2
  })

  await knex('relationships').insert({
    follower_id: 1,
    followee_id: 2
  })

  await knex.destroy()
})().catch(err => {
  console.error(err)
  throw err
})
