import { maybeQuote } from './util'

export function buildWhereFunction(resolveInfo, type, condition, options) {
  if (typeof condition === 'function') {
    return condition
  // otherwise, we'll assume they gave us the value(s) of the unique key.
  } else {
    // determine the type of quotes necessary to escape the uniqueKey column
    const quote = options.dialect === 'mysql' ? '`' : '"'

    // determine the unique key so we know what to search by
    const uniqueKey = type._typeConfig.uniqueKey

    // handle composite keys
    if (Array.isArray(uniqueKey)) {
      // it must have a corresponding array of values
      if (condition.length !== uniqueKey.length) {
        throw new Error(`The unique key for the "${type.name}" type is a composite. You must provide an array of values for each column.`)
      }
      return table => uniqueKey.map((key, i) => `${table}.${quote}${key}${quote} = ${maybeQuote(condition[i])}`).join(' AND ')
    // single keys are simple
    } else {
      return table => `${table}.${quote}${uniqueKey}${quote} = ${maybeQuote(condition)}`
    }
  }
}
