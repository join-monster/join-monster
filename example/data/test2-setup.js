const knex = require('./schema-setup')('test2')

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

  await knex.batchInsert('comments', [
    {
      body: 'Wow this is a great post, Matt.',
      post_id: 1,
      author_id: 1
    },
    {
      body: 'Do not forget to check out the demo.',
      post_id: 2,
      author_id: 1
    },
    {
      body: 'Also, submit a PR if you have a feature you want to add.',
      post_id: 2,
      author_id: 1
    },
    {
      body: 'Somebody please help me with thi library. It is so much work.',
      post_id: 2,
      author_id: 1
    }
  ])

  await knex.batchInsert('posts', [
    {
      body: 'If I could marry a programming language, it would be Haskell.',
      author_id: 2
    },
    {
      body: 'Check out this cool new GraphQL library, Join Monster.',
      author_id: 1
    }
  ])

  await knex('relationships').insert({
    follower_id: 1,
    followee_id: 2
  })

  await knex.batchInsert('sponsors', [
    {
      generation: 1,
      first_name: 'erlich',
      last_name: 'bachman'
    },
    {
      generation: 1,
      first_name: 'andrew',
      last_name: 'bachman'
    },
    {
      generation: 2,
      first_name: 'erlich',
      last_name: 'bachman'
    },
    {
      generation: 2,
      first_name: 'matt',
      last_name: 'bachman'
    },
    {
      generation: 1,
      first_name: 'matt',
      last_name: 'daemon'
    }
  ])

  await knex.destroy()
})().catch(err => {
  console.error(err)
  throw err
})
