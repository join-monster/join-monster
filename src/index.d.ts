import * as graphql from 'graphql'
export type Maybe<T> = null | undefined | T

// Extend graphql objects and fields

export type SqlJoin<TContext, TArgs> = (
  table1: string,
  table2: string,
  args: TArgs,
  context: TContext,
  sqlASTNode: any
) => string
export type Where<TContext, TArgs> = (
  usersTable: string,
  args: TArgs,
  context: TContext,
  sqlASTNode: any
) => string | void
export type Order = 'ASC' | 'asc' | 'DESC' | 'desc'
export type OrderBy = string | { [key: string]: Order }
export type ThunkWithArgsCtx<T, TContext, TArgs> =
  | ((args: TArgs, context: TContext) => T)
  | T

export interface ObjectTypeExtension<TSource, TContext> {
  alwaysFetch?: string
  sqlTable?: ThunkWithArgsCtx<string, any, TContext>
  uniqueKey?: string | string[]
}

export interface FieldConfigExtension<TSource, TContext, TArgs> {
  ignoreAll?: boolean
  ignoreTable?: boolean
  junction?: {
    include?: ThunkWithArgsCtx<
      {
        [column: string]: {
          sqlColumn?: string
          sqlExpr?: string
          sqlDeps?: string | string[]
        }
      },
      TContext,
      TArgs
    >
    orderBy?: ThunkWithArgsCtx<OrderBy, TContext, TArgs>
    sortKey?: ThunkWithArgsCtx<
      {
        order: Order
        key: string | string[]
      },
      TContext,
      TArgs
    >
    sqlBatch?: {
      thisKey: string
      parentKey: string
      sqlJoin: SqlJoin<TContext, TArgs>
    }
    sqlJoins?: [SqlJoin<TContext, TArgs>, SqlJoin<TContext, TArgs>]
    sqlTable: ThunkWithArgsCtx<string, TContext, TArgs>
    uniqueKey?: string | string[]
    where?: Where<TContext, TArgs>
  }
  limit?: ThunkWithArgsCtx<number, TContext, TArgs>
  orderBy?: ThunkWithArgsCtx<OrderBy, TContext, TArgs>
  sortKey?: ThunkWithArgsCtx<
    {
      order: Order
      key: string | string[]
    },
    TContext,
    TArgs
  >
  sqlBatch?: {
    thisKey: string
    parentKey: string
  }
  sqlColumn?: string
  sqlDeps?: string[]
  sqlExpr?: (
    table: string,
    args: TArgs,
    context: TContext,
    sqlASTNode: any
  ) => string
  sqlJoin?: SqlJoin<TContext, TArgs>
  sqlPaginate?: boolean
  where?: Where<TContext, TArgs>
}

export interface UnionTypeExtension {
  sqlTable?: string
  uniqueKey?: string | string[]
  alwaysFetch?: string
}

export interface InterfaceTypeExtension {
  sqlTable?: string
  uniqueKey?: string | string[]
  alwaysFetch?: string
}

declare module 'graphql' {
  interface GraphQLObjectTypeExtensions<TSource = any, TContext = any> {
    joinMonster?: ObjectTypeExtension<TSource, TContext>
  }
  interface GraphQLFieldExtensions<
    TSource,
    TContext,
    TArgs = { [argName: string]: any }
  > {
    joinMonster?: FieldConfigExtension<TSource, TContext, TArgs>
  }
  interface GraphQLUnionTypeExtensions {
    joinMonster?: UnionTypeExtension
  }
  interface GraphQLInterfaceTypeExtensions {
    joinMonster?: InterfaceTypeExtension
  }
}

// JoinMonster lib interface

interface DialectModule {
  name: string
}

type Dialect = 'pg' | 'oracle' | 'mariadb' | 'mysql' | 'mysql8' | 'sqlite3'
type JoinMonsterOptions = {
  minify?: boolean
  dialect?: Dialect
  dialectModule?: DialectModule
}

type Rows = any
type DbCallCallback = (
  sql: string,
  done: (err?: any, rows?: Rows) => void
) => void
type DbCallPromise = (sql: string) => Promise<Rows>

declare function joinMonster(
  resolveInfo: any,
  context: any,
  dbCall: DbCallCallback | DbCallPromise,
  options?: JoinMonsterOptions
): Promise<any>

export default joinMonster
