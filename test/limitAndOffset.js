import test from 'ava'
import { graphql } from 'graphql'
import schema from '../test-api/schema-basic/index'
import { errCheck } from './_util'

test('it should allow specifying a limit', async t => {
  const source = `{
    sponsors(limit: 1) {
      fullName
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    sponsors: [
      {
        fullName: 'erlich bachman',
      }
    ]
  }
  t.deepEqual(expect, data)
})


test('it should allow specifying a limit and an offset', async t => {
  const source = `{
    sponsors(limit: 1, offset: 1) {
      fullName
    }
  }`
  const { data, errors } = await graphql({schema, source})
  errCheck(t, errors)
  const expect = {
    sponsors: [
      {
        fullName: 'andrew bachman',
      }
    ]
  }
  t.deepEqual(expect, data)
})
