module.exports = async db => {
  const knex = await require('../schema/setup')(db, 'test1')

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
    },
    {
      email_address: 'foo@example.org',
      first_name: 'foo',
      last_name: 'bar'
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
    },
    {
      body: 'Here is who to contact if your brain has been ruined by Java.',
      author_id: 2,
      archived: true
    },
    {
      body: 'I have no valid author...',
      author_id: 12
    }
  ])

  await knex('posts').update({ archived: false }).where({ archived: null })

  await knex.batchInsert('comments', [
    {
      body: 'Wow this is a great post, Matt.',
      post_id: 1,
      author_id: 1
    },
    {
      body: 'That\'s super weird dude.',
      post_id: 1,
      author_id: 3,
      archived: true
    },
    {
      body: 'That\'s ultra weird bro.',
      post_id: 1,
      author_id: 3
    },
    {
      body: 'Do not forget to check out the demo.',
      post_id: 2,
      author_id: 1
    },
    {
      body: 'This sucks. Go use REST you scrub.',
      post_id: 2,
      author_id: 3
    },
    {
      body: 'Also, submit a PR if you have a feature you want to add.',
      post_id: 2,
      author_id: 1
    },
    {
      body: 'FIRST COMMENT!',
      post_id: 2,
      author_id: 2,
      archived: true
    },
    {
      body: 'Somebody please help me with this library. It is so much work.',
      post_id: 2,
      author_id: 1
    },
    {
      body: 'Yeah well Java 8 added lambdas.',
      post_id: 3,
      author_id: 3
    }
  ])

  await knex('comments').update({ archived: false }).where({ archived: null })

  await knex.batchInsert('relationships', [
    {
      follower_id: 1,
      followee_id: 2,
      closeness: 'best'
    },
    {
      follower_id: 3,
      followee_id: 2,
      closeness: 'acquaintance'
    },
    {
      follower_id: 3,
      followee_id: 1,
      closeness: 'acquaintance'
    }
  ])

  await knex.batchInsert('likes', [
    {
      account_id: 2,
      comment_id: 1,
    },
    {
      account_id: 1,
      comment_id: 3
    },
    {
      account_id: 3,
      comment_id: 3
    },
    {
      account_id: 1,
      comment_id: 9
    },
    {
      account_id: 2,
      comment_id: 9
    }
  ])

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
}
