import test from 'ava'
import { graphql } from 'graphql'
import schemaRelay from '../../test-api/schema-paginated/index'
import { partial } from 'lodash'
import { errCheck } from '../_util'

const run = partial(graphql, schemaRelay)

test('should handle limit at the root', async t => {
  const query = `{
    usersFirst2 {
      fullName
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    usersFirst2: [
      { fullName: 'andrew carlson' },
      { fullName: 'matt elder' }
    ]
  }
  t.deepEqual(expect, data)
})

test('should handle limit for one-to-many', async t => {
  const query = `{
    user(id: 1) {
      commentsLast2 {
        id
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      commentsLast2: [
        { id: 'Q29tbWVudDo4' },
        { id: 'Q29tbWVudDo2' }
      ]
    }
  }
  t.deepEqual(expect, data)
})

test('should handle limit for many-to-many', async t => {
  const query = `{
    user(id: 3) {
      followingFirst {
        fullName
      }
    }
  }`
  const { data, errors } = await run(query)
  errCheck(t, errors)
  const expect = {
    user: {
      followingFirst: [
        { fullName: 'andrew carlson' }
      ]
    }
  }
  t.deepEqual(expect, data)
})
