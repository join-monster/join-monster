import test from 'ava'
import { graphql } from 'graphql'
import schema from '../../test-api/schema-paginated/index'
import { errCheck } from '../_util'

test('should handle limit at the root', async (t) => {
  const source = `{
    usersFirst2 {
      fullName
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    usersFirst2: [{ fullName: 'andrew carlson' }, { fullName: 'matt elder' }],
  }
  t.deepEqual(expect, data)
})

test('should handle limit for one-to-many', async (t) => {
  const source = `{
    user(id: 1) {
      commentsLast2 {
        id
      }
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      commentsLast2: [{ id: 'Q29tbWVudDo4' }, { id: 'Q29tbWVudDo2' }],
    },
  }
  t.deepEqual(expect, data)
})

test('should handle limit for many-to-many', async (t) => {
  const source = `{
    user(id: 3) {
      followingFirst {
        fullName
      }
    }
  }`
  const { data, errors } = await graphql({ schema, source })
  errCheck(t, errors)
  const expect = {
    user: {
      followingFirst: [{ fullName: 'andrew carlson' }],
    },
  }
  t.deepEqual(expect, data)
})
