import test from 'ava'
import { graphql } from 'graphql'
import schema from '../test-api/schema-basic/index'
import { errCheck } from './_util'


test('should handle data from the junction table', async t => {
  const source = `{
    user(id: 3) {
      fullName
      following {
        id
        intimacy
      }
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 1,
          intimacy: 'acquaintance'
        },
        {
          id: 2,
          intimacy: 'best'
        }
      ]
    }
  }
  t.deepEqual(expect, data)
})
