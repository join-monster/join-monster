
import * as graphql from 'graphql'
import {SqlBind} from 'sqlbind';

// Extend graphql objects and fields

declare module 'graphql/type/definition' {
  type SqlJoin<TContext, TArgs> = (table1: string, table2: string, args: TArgs, context: TContext, sqlASTNode: any) => string | SqlBind
  type Where<TContext, TArgs> = (usersTable: string, args: TArgs, context: TContext, sqlASTNode: any) => string | void | SqlBind
  type Order = 'ASC' | 'asc' | 'DESC' | 'desc'
  type OrderBy = string | { [key: string]: Order }
  type ThunkWithArgsCtx<T, TContext, TArgs> = ((args: TArgs, context: TContext) => T) | T;

  export interface GraphQLObjectTypeConfig<TSource, TContext> {
    alwaysFetch?: string
    sqlTable?: ThunkWithArgsCtx<string | SqlBind, any, TContext>
    uniqueKey?: string | string[]
  }

  export interface GraphQLFieldConfig<TSource, TContext, TArgs> {
    jmIgnoreAll?: boolean
    jmIgnoreTable?: boolean
    junction?: {
      include?: ThunkWithArgsCtx<{
        sqlColumn?: string
        sqlExpr?: string | SqlBind
        sqlDeps?: string | string[]
      }, TContext, TArgs>
      orderBy?: ThunkWithArgsCtx<OrderBy, TContext, TArgs>
      sortKey?: ThunkWithArgsCtx<{
        order: Order
        key: string | string[]
      }, TContext, TArgs>
      sqlBatch?: {
        thisKey: string
        parentKey: string
        sqlJoin: SqlJoin<TContext, TArgs>
      }
      sqlJoins?: [SqlJoin<TContext, TArgs>, SqlJoin<TContext, TArgs>]
      sqlTable: ThunkWithArgsCtx<string | SqlBind, TContext, TArgs>
      uniqueKey?: string | string[]
      where?: Where<TContext, TArgs>
    }
    limit?: ThunkWithArgsCtx<number, any, TContext>
    orderBy?: ThunkWithArgsCtx<OrderBy, TContext, TArgs>
    sortKey?: ThunkWithArgsCtx<{
      order: Order
      key: string | string[]
    }, TContext, TArgs>
    sqlBatch?: {
      thisKey: string
      parentKey: string
    }
    sqlColumn?: string
    sqlDeps?: string[]
    sqlExpr?: (table: string, args: TArgs, context: TContext, sqlASTNode: any) => string
    sqlJoin?: SqlJoin<TContext, TArgs>
    sqlPaginate?: boolean
    where?: Where<TContext, TArgs>
  }
}

export interface GraphQLUnionTypeConfig<TSource, TContext> {
  sqlTable?: string
  uniqueKey?: string | string[]
  alwaysFetch?: string
}

export interface GraphQLInterfaceTypeConfig<TSource, TContext> {
  sqlTable?: string
  uniqueKey?: string | string[]
  alwaysFetch?: string
}

// JoinMonster lib interface

interface DialectModule { name: string }

type Dialect = 'pg' | 'oracle' | 'mariadb' | 'mysql' | 'sqlite3'
type JoinMonsterOptions = { minify?: boolean, dialect?: Dialect, dialectModule?: DialectModule }

type Rows = any
type DbCallCallback<T> = (sql:T, done: (err?: any, rows?: Rows) => void) => void
type DbCallPromise<T> = (sql: T) => Promise<Rows>

type DbCall = DbCallCallback<string> | DbCallPromise<string>
type DbCallParameterize = DbCallCallback<SqlBind> | DbCallPromise<SqlBind>

declare function joinMonster(resolveInfo: any, context: any, dbCall: DbCall, options?: JoinMonsterOptions) : Promise<any>
declare function joinMonsterParameterize(resolveInfo: any, context: any, dbCall: DbCallParameterize, options?: JoinMonsterOptions) : Promise<any>

export default joinMonster
export {joinMonsterParameterize}
