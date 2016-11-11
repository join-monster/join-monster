
export function toBase64(clear) {
  return Buffer.from(String(clear)).toString('base64')
}

export function fromBase64(encoded) {
  return Buffer.from(encoded, 'base64').toString('utf8')
}
