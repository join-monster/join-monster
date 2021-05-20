import { expectType } from 'tsd'
import joinMonster from '..'
import { GraphQLObjectType, GraphQLList } from 'graphql'

type ExampleContext = {
  foo: 'bar'
}
type ExampleArgs = { [key: string]: any }

// test table level extensions
const User = new GraphQLObjectType({
  name: 'User',
  extensions: {
    joinMonster: {
      sqlTable: 'accounts',
      uniqueKey: 'id',
      alwaysFetch: 'createdAt'
    }
  },
  fields: {}
})

// test sqlTable thunk
new GraphQLObjectType<any, ExampleContext>({
  name: 'User',
  extensions: {
    joinMonster: {
      sqlTable: (args, context) => {
        expectType<any>(args)
        expectType<ExampleContext>(context)
        return 'expr'
      }
    }
  },
  fields: {}
})

// test field extensions
new GraphQLObjectType<any, ExampleContext>({
  name: 'User',
  fields: () => ({
    following: {
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          ignoreAll: true,
          ignoreTable: true,
          limit: 10,
          orderBy: [
            { column: 'foo', direction: 'asc' },
            { column: 'bar', direction: 'DESC' }
          ],
          sortKey: {
            order: 'ASC', // old style of sortKey
            key: ['id']
          },
          sqlBatch: {
            thisKey: 'foo',
            parentKey: 'bar'
          },
          sqlColumn: 'foo',
          sqlDeps: ['bar', 'baz'],
          sqlExpr: (table, args, context) => {
            expectType<string>(table)
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return 'expr'
          },
          sqlJoin: (table1, table2, args, context) => {
            expectType<string>(table1)
            expectType<string>(table2)
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return 'foo'
          },
          sqlPaginate: true,
          where: (table, args, context) => {
            expectType<string>(table)
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return `${table}.is_active = TRUE`
          }
        }
      }
    }
  })
})

// test thunked field extensions
new GraphQLObjectType<any, ExampleContext>({
  name: 'User',
  fields: () => ({
    following: {
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          limit: (args, context) => {
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return 10
          },
          orderBy: (args, context) => {
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return [
              { column: 'foo', direction: 'ASC' },
              { column: 'bar', direction: 'DESC' }
            ]
          },
          sortKey: (args, context) => {
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return [
              {
                direction: 'ASC',
                column: 'id'
              }
            ]
          }
        }
      }
    }
  })
})

// test junction includes
new GraphQLObjectType<any, ExampleContext>({
  name: 'User',
  fields: () => ({
    following: {
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          where: accountTable => `${accountTable}.is_active = TRUE`,
          junction: {
            sqlTable: 'relationships',
            orderBy: {
              foo: 'ASC',
              bar: 'DESC'
            },
            sortKey: {
              order: 'ASC',
              key: ['id']
            },
            sqlBatch: {
              thisKey: 'foo',
              parentKey: 'bar',
              sqlJoin: (table1, table2, args, context) => {
                expectType<string>(table1)
                expectType<string>(table2)

                return 'foo'
              }
            },
            include: {
              closeness: {
                sqlColumn: 'closeness'
              }
            },
            sqlJoins: [
              (followerTable, junctionTable, args, context) => {
                expectType<string>(followerTable)
                expectType<string>(junctionTable)
                expectType<ExampleArgs>(args)
                expectType<ExampleContext>(context)
                return `${followerTable}.id = ${junctionTable}.follower_id`
              },
              (junctionTable, followeeTable, args, context) => {
                expectType<string>(followeeTable)
                expectType<string>(junctionTable)
                expectType<ExampleArgs>(args)
                expectType<ExampleContext>(context)
                return `${junctionTable}.followee_id = ${followeeTable}.id`
              }
            ]
          }
        }
      }
    }
  })
})

// test thunked junction includes
new GraphQLObjectType<any, ExampleContext>({
  name: 'User',
  fields: () => ({
    following: {
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          where: accountTable => `${accountTable}.is_active = TRUE`,
          junction: {
            sqlTable: (args, context) => {
              expectType<ExampleArgs>(args)
              expectType<ExampleContext>(context)
              return 'relationships'
            },
            orderBy: (args, context) => {
              expectType<ExampleArgs>(args)
              expectType<ExampleContext>(context)
              return {
                foo: 'ASC',
                bar: 'DESC'
              }
            },
            sortKey: (args, context) => {
              expectType<ExampleArgs>(args)
              expectType<ExampleContext>(context)
              return {
                order: 'ASC',
                key: ['id']
              }
            },
            include: (args, context) => {
              expectType<ExampleArgs>(args)
              expectType<ExampleContext>(context)

              return {
                closeness: {
                  sqlColumn: 'closeness'
                }
              }
            },
            where: (junctionTable, args, context) => {
              expectType<string>(junctionTable)
              expectType<ExampleArgs>(args)
              expectType<ExampleContext>(context)
              return `${junctionTable}.follower_id <> ${junctionTable}.followee_id`
            }
          }
        }
      }
    }
  })
})
