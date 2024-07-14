import sinon from 'sinon'
import test from 'ava'
import AliasNamespace from '../src/alias-namespace'
import { graphql } from 'graphql'
import schema from '../test-api/schema-basic/index'

test(`it should generate a minified table alias`, (t) => {
  const ns = new AliasNamespace(true)
  t.is(ns.generate('table', 'users'), 'a')
  t.is(ns.generate('table', 'users'), 'b')
})

test(`it should generate a minified, prefixed table alias`, (t) => {
  const ns = new AliasNamespace(true, '$')
  t.is(ns.generate('table', 'users'), '$a')
  t.is(ns.generate('table', 'users'), '$b')
})

test(`it should generate a minified column alias`, (t) => {
  // columns are cached by name and reused
  const ns = new AliasNamespace(true)
  t.is(ns.generate('column', 'firstname'), 'a')
  t.is(ns.generate('column', 'firstname'), 'a')
})

test(`it should generate a minified, non-prefixed column alias`, (t) => {
  // columns are cached by name and reused
  const ns = new AliasNamespace(true, '$')
  t.is(ns.generate('column', 'firstname'), 'a')
  t.is(ns.generate('column', 'firstname'), 'a')
})

test(`it should generate an unminified table alias`, (t) => {
  const ns = new AliasNamespace(false)
  t.is(ns.generate('table', 'users'), 'users')
  t.is(ns.generate('table', 'users'), 'users$')
  t.is(ns.generate('table', 'users'), 'users$$')
})

test(`it should generate an unminified, prefixed table alias`, (t) => {
  const ns = new AliasNamespace(false, '$')
  t.is(ns.generate('table', 'users'), '$users')
  t.is(ns.generate('table', 'users'), '$users$')
  t.is(ns.generate('table', 'users'), '$users$$')
})

test(`it should generate an unminified column alias`, (t) => {
  // columns are cached by name and reused
  const ns = new AliasNamespace(false)
  t.is(ns.generate('column', 'firstname'), 'firstname')
  t.is(ns.generate('column', 'firstname'), 'firstname')
})

test(`it should generate an unminified, non-prefixed column alias`, (t) => {
  // columns are cached by name and reused
  const ns = new AliasNamespace(false, '$')
  t.is(ns.generate('column', 'firstname'), 'firstname')
  t.is(ns.generate('column', 'firstname'), 'firstname')
})

test(`it should generate an unminified table alias (diffenent names won't collapse to alias)`, (t) => {
  const ns = new AliasNamespace(false)
  t.is(ns.generate('table', 'InformationItem'), 'Informatio')
  t.is(ns.generate('table', 'InformationItemHasGroup'), 'Informatio$')
})

test(`it should generate an unminified, prefixed table alias (diffenent names won't collapse to alias)`, (t) => {
  const ns = new AliasNamespace(false, '$')
  t.is(ns.generate('table', 'InformationItem'), '$Informatio')
  t.is(ns.generate('table', 'InformationItemHasGroup'), '$Informatio$')
})

if (process.env.DB === 'PG' && !process.env.STRATEGY && !process.env.MINIFY) {
  test('it should warn when alias in longer than dialect can accept', async (t) => {
    const spy = sinon.spy(console, 'warn')

    const source = `
      {
        users {
          comments {
            post {
              author {
                following {
                  posts {
                    author {
                      capitalizedLastName
                    }
                  }
                }
              }
            }
          }
        }
      }
    `
    await graphql({ schema, source })
    // eslint-disable-next-line max-len
    t.assert(
      spy.calledWith(
        'Alias length exceeds the max allowed length of 63 characters for pg: upper("author$"."last_name") AS "comments__post__author__following__posts__author$__capitalizedLastName"',
      ),
    )
  })
}
