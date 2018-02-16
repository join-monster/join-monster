
import * as graphql from 'graphql'

// Extend graphql objects and fields

declare module 'graphql/type/definition' {
  type SqlJoin<TContext, TArgs> = (table1: string, table2: string, args: TArgs, context: TContext) => string
  type Where<TContext, TArgs> = (usersTable: string, args: TArgs, context: TContext) => string | void
  type OrderBy = string | { [key: string]: 'ASC' | 'asc' | 'DESC' | 'desc' }

  export interface GraphQLObjectTypeConfig<TSource, TContext> {
    alwaysFetch?: string
    sqlTable?: string
    uniqueKey?: string
  }

  export interface GraphQLFieldConfig<TSource, TContext, TArgs> {
    jmIgnoreAll?: boolean
    jmIgnoreTable?: boolean
    junction?: {
      include?: {
        sqlColumn?: string
        sqlExpr?: string
        sqlDeps?: string | string[]
      }
      sqlBatch?: {
        thisKey: string
        parentKey: string
        sqlJoin: SqlJoin<TContext, TArgs>
      }
      sqlJoins?: [SqlJoin<TContext, TArgs>, SqlJoin<TContext, TArgs>]
      sqlTable: string
      uniqueKey?: string[]
      where?: Where<TContext, TArgs>
    }
    limit?: number
    orderBy?: Thunk<OrderBy>
    sortKey?: {
      order: 'ASC' | 'asc' | 'DESC' | 'desc'
      key: string | string[]
    }
    sqlBatch?: {
      thisKey: string
      parentKey: string
    }
    sqlColumn?: string
    sqlDeps?: string[]
    sqlExpr?: (table: string, args: TArgs, context: TContext) => string
    sqlJoin?: SqlJoin<TContext, TArgs>
    sqlPaginate?: boolean
    where?: Where<TContext, TArgs>
  }
}

// JoinMonster lib interface

interface DialectModule { name: string }

type Dialect = 'pg' | 'oracle' | 'mariadb' | 'mysql' | 'sqlite'
type JoinMonsterOptions = { minify?: boolean, dialect?: Dialect, dialectModule?: DialectModule }

type Rows = any
type DbCallCallback = (sql:string, done: (err?: any, rows?: Rows) => void) => void
type DbCallPromise = (sql: string) => Promise<Rows>
type DbCall = DbCallCallback | DbCallPromise

declare function joinMonster(resolveInfo: any, context: any, dbCall: DbCallCallback | DbCallPromise, options?: JoinMonsterOptions) : Promise<any>

export default joinMonster
