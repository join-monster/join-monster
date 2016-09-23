import test from 'ava'
import { graphql } from 'graphql'
import schema from '../example/schema/index'
import sinon from 'sinon'
import queryASTToSqlAST from '../src/queryASTToSqlAST'
import stringifySqlAST from '../src/stringifySqlAST'
import makeNestHydrationSpec from '../src/makeNestHydrationSpec'

let ast
let sqlAST
let sql
let nestSpec

// before starting the test, run the query and grab that ast
test.before(async () => {
  // in order to start testing the individual functions, we need to give the rights args
  // so we need access to the 'AST' info in graphql. we'll use a sinon spy to get a reference to that obj
  const resolveSpy = sinon.spy(schema._queryType._fields.user, 'resolve')

  const query = `{
    user(id: 1) {
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
  await graphql(schema, query)
  ast = resolveSpy.lastCall.args[3]
})

test.serial('queryASTToSqlAST', t => {
  sqlAST = queryASTToSqlAST(ast)
  const expect = JSON.stringify({
    table: 'accounts',
    as: 'user',
    args: { id: '1' },
    fieldName: 'user',
    grabMany: false,
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
        children: [
          { column: 'id', fieldName: 'id' },
          { columnDeps: [ 'first_name', 'last_name' ] },
        ]
      },
      {
        table: 'comments',
        as: 'comments',
        fieldName: 'comments',
        grabMany: true,
        sqlJoin: () => {},
        children: [
          { column: 'id', fieldName: 'id' },
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
                as: 'author$',
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
  // checking the stringified versions are equal instead of checking deep equality by value. most libraries do not check value equality for functions, and these object have functinos on them.
  // JSON.stringify just omits any keyes where the value is a function type
  t.is(JSON.stringify(sqlAST), expect, 'stringified versions of the ast should be equal')
  // since the previous test didn't check the functions, lets make sure we see some functions where they should be
  t.is(typeof sqlAST.where, 'function')
  t.is(typeof sqlAST.children[6].sqlJoin, 'function')
  t.is(typeof sqlAST.children[6].children[3].sqlJoin, 'function')
  t.is(typeof sqlAST.children[6].children[4].sqlJoin, 'function')
  t.is(typeof sqlAST.children[6].children[4].children[2].sqlJoin, 'function')
})

test.serial('stringifySqlAST', t => {
  sql = stringifySqlAST(sqlAST)
  const expect = `\
SELECT
  "user"."id" AS "id",
  "user"."email_address" AS "email_address",
  "user"."first_name" AS "first_name",
  "user"."last_name" AS "last_name",
  "following"."id" AS "following__id",
  "following"."first_name" AS "following__first_name",
  "following"."last_name" AS "following__last_name",
  "comments"."id" AS "comments__id",
  "comments"."body" AS "comments__body",
  "author"."first_name" AS "comments__author__first_name",
  "author"."last_name" AS "comments__author__last_name",
  "post"."id" AS "comments__post__id",
  "post"."body" AS "comments__post__body",
  "author$"."first_name" AS "comments__post__author$__first_name",
  "author$"."last_name" AS "comments__post__author$__last_name"
FROM "accounts" AS "user"
LEFT JOIN "relationships" AS "relationships" ON "user".id = "relationships".follower_id
LEFT JOIN "accounts" AS "following" ON "relationships".followee_id = "following".id
LEFT JOIN "comments" AS "comments" ON "user".id = "comments".author_id
LEFT JOIN "accounts" AS "author" ON "comments".author_id = "author".id
LEFT JOIN "posts" AS "post" ON "comments".post_id = "post".id
LEFT JOIN "accounts" AS "author$" ON "post".author_id = "author$".id
WHERE "user".id = 1`
  t.is(sql, expect)
})

test.serial('makeNestHydrationSpec', t => {
  nestSpec = makeNestHydrationSpec(sqlAST)
  const expect = {
    first_name: 'first_name',
    last_name: 'last_name',
    id: 'id',
    idEncoded: 'id',
    globalId: 'id',
    email: 'email_address',
    following: [
      {
        id: 'following__id',
        first_name: 'following__first_name',
        last_name: 'following__last_name'
      }
    ],
    comments: [
      {
        id: 'comments__id',
        body: 'comments__body',
        author: {
          first_name: 'comments__author__first_name',
          last_name: 'comments__author__last_name'
        },
        post: {
          id: 'comments__post__id',
          body: 'comments__post__body',
          author: {
            first_name: 'comments__post__author$__first_name',
            last_name: 'comments__post__author$__last_name'
          }
        }
      }
    ]
  }
  
  t.deepEqual(nestSpec, expect)
})

