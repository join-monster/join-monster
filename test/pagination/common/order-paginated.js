import test from 'ava'
import { graphql } from 'graphql'
import schema from '../../../test-api/schema-paginated/index'
import { offsetToCursor, toGlobalId } from 'graphql-relay'
import { objToCursor } from '../../../src/util'
import { errCheck } from '../../_util'

if (process.env.PAGINATE === 'keyset') {
  test('[keyset] should handle order columns on the main table', async t => {
    const source  = `{
      user(id: 2) {
        fullName
        following(first: 2, sortOnMain: true, after: "${objToCursor({
          created_at: '2015-10-19T05:48:04.537Z',
          id: 3
        })}") {
          edges {
            node {
              id
              fullName
            }
          }
        }
      }
    }`
    const { data, errors } = await graphql({schema, source})
    errCheck(t, errors)
    const expect = {
      user: {
        fullName: 'Hudson Hyatt',
        following: {
          edges: [
            {
              node: {
                id: toGlobalId('User', 1),
                fullName: 'Alivia Waelchi'
              }
            },
            {
              node: {
                id: toGlobalId('User', 2),
                fullName: 'Hudson Hyatt'
              }
            }
          ]
        }
      }
    }
    t.deepEqual(expect, data)
  })
  
  test('[keyset] should handle order columns on the junction table', async t => {
    const cursor = objToCursor({
      created_at: '2016-01-01T16:28:00.051Z',
      followee_id: 1
    })
    const source  = `{
      user(id: 2) {
        fullName
        following(first: 2, sortOnMain: false, after: "${cursor}") {
          edges {
            node {
              id
              fullName
            }
          }
        }
      }
    }`
    const { data, errors } = await graphql({schema, source})
    errCheck(t, errors)
    const expect = {
      user: {
        fullName: 'Hudson Hyatt',
        following: {
          edges: [
            {
              node: {
                id: toGlobalId('User', 3),
                fullName: 'Coleman Abernathy'
              }
            },
            {
              node: {
                id: toGlobalId('User', 2),
                fullName: 'Hudson Hyatt'
              }
            }
          ]
        }
      }
    }
    t.deepEqual(expect, data)
  })
}

if (process.env.PAGINATE === 'offset') {
  test('[offset] should handle order columns on the main table', async t => {
    const source = `{
      user(id: 2) {
        fullName
        following(first: 2, sortOnMain: true, after: "${offsetToCursor(0)}") {
          edges {
            node {
              id
              fullName
            }
          }
        }
      }
    }`
    const { data, errors } = await graphql({schema, source})
    errCheck(t, errors)
    const expect = {
      user: {
        fullName: 'Hudson Hyatt',
        following: {
          edges: [
            {
              node: {
                id: toGlobalId('User', 1),
                fullName: 'Alivia Waelchi'
              }
            },
            {
              node: {
                id: toGlobalId('User', 2),
                fullName: 'Hudson Hyatt'
              }
            }
          ]
        }
      }
    }
    t.deepEqual(expect, data)
  })
  
  test('[offset] should handle order columns on the junction table', async t => {
    const source = `{
      user(id: 2) {
        fullName
        following(first: 2, sortOnMain: false, after: "${offsetToCursor(0)}") {
          edges {
            node {
              id
              fullName
            }
          }
        }
      }
    }`
    const { data, errors } = await graphql({schema, source})
    errCheck(t, errors)
    const expect = {
      user: {
        fullName: 'Hudson Hyatt',
        following: {
          edges: [
            {
              node: {
                id: toGlobalId('User', 2),
                fullName: 'Hudson Hyatt'
              }
            },
            {
              node: {
                id: toGlobalId('User', 3),
                fullName: 'Coleman Abernathy'
              }
            }
          ]
        }
      }
    }
    t.deepEqual(expect, data)
  })  
}
