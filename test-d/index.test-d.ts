import { expectType } from 'tsd'
import { GraphQLObjectType, GraphQLList } from 'graphql'

type ExampleContext = {
  foo: 'bar'
}
type ExampleArgs = { [key: string]: any }
// test table level extensions
let User = new GraphQLObjectType({
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
User = new GraphQLObjectType<any, ExampleContext>({
  name: 'User',
  extensions: {
    joinMonster: {
      sqlTable: (args: ExampleArgs, context: ExampleContext) => {
        expectType<ExampleArgs>(args)
        expectType<ExampleContext>(context)
        return 'expr'
      }
    }
  },
  fields: {}
})

// test field extensions
User = new GraphQLObjectType<any, ExampleContext>({
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
          sqlExpr: (table: string, args: ExampleArgs, context: ExampleContext) => {
            expectType<string>(table)
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return 'expr'
          },
          sqlJoin: (table1: string, table2: string, args: ExampleArgs, context: ExampleContext) => {
            expectType<string>(table1)
            expectType<string>(table2)
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return 'foo'
          },
          sqlPaginate: true,
          where: (table:string, args: ExampleArgs, context: ExampleContext) => {
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
User = new GraphQLObjectType<any, ExampleContext>({
  name: 'User',
  fields: () => ({
    following: {
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          limit: (args: ExampleArgs, context: ExampleContext) => {
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return 10
          },
          orderBy: (args: ExampleArgs, context: ExampleContext) => {
            expectType<ExampleArgs>(args)
            expectType<ExampleContext>(context)
            return [
              { column: 'foo', direction: 'ASC' },
              { column: 'bar', direction: 'DESC' }
            ]
          },
          sortKey: (args: ExampleArgs, context: ExampleContext) => {
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
User = new GraphQLObjectType<any, ExampleContext>({
  name: 'User',
  fields: () => ({
    following: {
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          where: (accountTable: string) => `${accountTable}.is_active = TRUE`,
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
              sqlJoin: (table1: string, table2: string) => {
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
              (followerTable: string, junctionTable: string, args: ExampleArgs, context: ExampleContext) => {
                expectType<string>(followerTable)
                expectType<string>(junctionTable)
                expectType<ExampleArgs>(args)
                expectType<ExampleContext>(context)
                return `${followerTable}.id = ${junctionTable}.follower_id`
              },
              (junctionTable: string, followeeTable: string, args: ExampleArgs, context: ExampleContext) => {
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
User = new GraphQLObjectType<any, ExampleContext>({
  name: 'User',
  fields: () => ({
    following: {
      type: new GraphQLList(User),
      extensions: {
        joinMonster: {
          where: (accountTable: string) => `${accountTable}.is_active = TRUE`,
          junction: {
            sqlTable: (args: ExampleArgs, context: ExampleContext) => {
              expectType<ExampleArgs>(args)
              expectType<ExampleContext>(context)
              return 'relationships'
            },
            orderBy: (args: ExampleArgs, context: ExampleContext) => {
              expectType<ExampleArgs>(args)
              expectType<ExampleContext>(context)
              return {
                foo: 'ASC',
                bar: 'DESC'
              }
            },
            sortKey: (args: ExampleArgs, context: ExampleContext) => {
              expectType<ExampleArgs>(args)
              expectType<ExampleContext>(context)
              return {
                order: 'ASC',
                key: ['id']
              }
            },
            include: (args: ExampleArgs, context: ExampleContext) => {
              expectType<ExampleArgs>(args)
              expectType<ExampleContext>(context)

              return {
                closeness: {
                  sqlColumn: 'closeness'
                }
              }
            },
            where: (junctionTable: string, args: ExampleArgs, context: ExampleContext) => {
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
