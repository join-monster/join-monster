import util from 'util'
import test from 'ava'
import { graphql } from 'graphql'
import schema from '../example/schema/index'
import sinon from 'sinon'
import deepEqual from './_deepEqual'
import queryASTToSqlAST from '../src/queryASTToSqlAST'

const resolveSpy = sinon.spy(schema._queryType._fields.users, 'resolve')

const query = `{
  users(id: 1) {
    id
    idEncoded
    globalId
    email
    full_name
    following {
      full_name
    }
    comments {
      id
      body
      author {
        full_name
      }
      post {
        id
        body
        author {
          full_name
        }
      }
    }
  }
}`

test.before(async () => {
  await graphql(schema, query)
})

test('get a field with the same name as the SQL column', async t => {
  const ast = resolveSpy.lastCall.args[3]
  const sqlAST = queryASTToSqlAST(ast)
  const expect = JSON.stringify({
    table: 'accounts',
    as: 'users',
    args: { id: '1' },
    fieldName: 'users',
    grabMany: true,
    where: () => {},
    children: [
      { column: 'id', fieldName: 'id' },
      { column: 'id', fieldName: 'idEncoded' },
      { column: 'id', fieldName: 'globalId' },
      { column: 'email_address', fieldName: 'email' },
      { columnDeps: [ 'first_name', 'last_name' ] },
      {
        table: 'accounts',
        as: 'following',
        fieldName: 'following',
        grabMany: true,
        sqlJoins: [ () => {}, () => {} ],
        joinTable: 'relationships',
        joinTableAs: 'relationships',
        children: [ { columnDeps: [ 'first_name', 'last_name' ] } ]
      },
      {
        table: 'comments',
        as: 'comments',
        fieldName: 'comments',
        grabMany: true,
        sqlJoin: () => {},
        children: [
          { column: 'id', fieldName: 'id' },
          { column: 'body', fieldName: 'body' },
          {
            table: 'accounts',
            as: 'author',
            fieldName: 'author',
            grabMany: false,
            sqlJoin: () => {},
            children: [ { columnDeps: [ 'first_name', 'last_name' ] } ]
          },
          {
            table: 'posts',
            as: 'post',
            fieldName: 'post',
            grabMany: false,
            sqlJoin: () => {},
            children: [
              { column: 'id', fieldName: 'id' },
              { column: 'body', fieldName: 'body' },
              {
                table: 'accounts',
                as: 'author_',
                fieldName: 'author',
                grabMany: false,
                sqlJoin: () => {},
                children: [ { columnDeps: [ 'first_name', 'last_name' ] } ]
              }
            ]
          }
        ]
      }
    ]
  })
  t.is(JSON.stringify(sqlAST), expect)
  t.is(typeof sqlAST.where, 'function')
  t.is(typeof sqlAST.children[6].sqlJoin, 'function')
  t.is(typeof sqlAST.children[6].children[2].sqlJoin, 'function')
  t.is(typeof sqlAST.children[6].children[3].sqlJoin, 'function')
  t.is(typeof sqlAST.children[6].children[3].children[2].sqlJoin, 'function')
})


