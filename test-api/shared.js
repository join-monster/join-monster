export function q(str, dbType) {
  switch (dbType) {
    case 'MYSQL':
      return `\`${str}\``
    case 'PG':
    case 'ORACLE':
      return `"${str}"`
    default:
      return `"${str}"`
  }
}

export function bool(isTrue, dbType) {
  switch (dbType) {
    case 'PG':
    case 'MYSQL':
      return isTrue ? 'TRUE' : 'FALSE'
    case 'sqlite3':
    case 'oracle':
      return isTrue ? 1 : 0
    default:
      return isTrue ? 1 : 0
  }
}

export function toBase64(clear) {
  return Buffer.from(String(clear)).toString('base64')
}

export function fromBase64(encoded) {
  return Buffer.from(encoded, 'base64').toString('utf8')
}
