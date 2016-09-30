import faker from 'faker'

const knex = require('./schema-setup')('demo')

function* count(limit) {
  for (let i = 0; i < limit; i++) {
    yield i
  }
}

const numUsers = 5
const numPosts = 10
const numComments = 25
const numRelationships = 15

;(async () => {

  console.log('creating accounts...')
  const accounts = new Array(numUsers)
  for (let i of count(numUsers)) {
    accounts[i] = {
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
      email_address: faker.internet.email()
    }
  }
  await knex.batchInsert('accounts', accounts, 50)

  console.log('creating posts...')
  const posts = new Array(numPosts)
  for (let i of count(numPosts)) {
    posts[i] = {
      body: faker.lorem.sentences(faker.random.number({ min: 2, max: 4 })),
      author_id: faker.random.number({ min: 1, max: numUsers })
    }
  }
  await knex.batchInsert('posts', posts, 50)

  console.log('creating comments...')
  const comments = new Array(numComments)
  for (let i of count(numComments)) {
    comments[i] = {
      body: faker.hacker.phrase(),
      post_id: faker.random.number({ min: 1, max: numPosts }),
      author_id: faker.random.number({ min: 1, max: numUsers })
    }
  }
  await knex.batchInsert('comments', comments, 50)

  console.log('creating relationships...')
  const relationships = new Array(numRelationships)
  for (let i of count(numRelationships)) {
    relationships[i] = {
      follower_id: faker.random.number({ min: 1, max: numUsers }),
      followee_id: faker.random.number({ min: 1, max: numUsers })
    }
  }
  await knex.batchInsert('relationships', relationships, 50)

  await knex.destroy()

})().catch(err => { throw err })
