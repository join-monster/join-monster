import test from 'ava'
import { graphql } from 'graphql'
import schemaBasic from '../test-api/schema-basic/index'
import { partial } from 'lodash'
import { errCheck } from './_util'

const run = partial(graphql, schemaBasic)

test('should handle data from the junction table', async t => {
  const query = `{
    user(id: 3) {
      fullName
      following {
        id
        intimacy
      }
    }
  }`
  const { data, errors } = await run(query)
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
