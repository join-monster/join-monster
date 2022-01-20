import test from 'ava'
import { maybeQuote } from '../src/util'

test('it should handle a bigint input', async t => {
  const output = maybeQuote(24n, 'postgres')
  const expected = 24n
  t.deepEqual(output, expected)
})

test('it should handle a number input', async t => {
  const output = maybeQuote(24, 'postgres')
  const expected = 24
  t.deepEqual(output, expected)
})

test('it should handle an empty value', async t => {
  const output = maybeQuote(null, 'postgres')
  const expected = 'NULL'
  t.deepEqual(output, expected)
})

test('it should handle a date value in non-oracle dialects', async t => {
  const output = maybeQuote('1970-01-01T01:01:01', 'postgres')
  const expected = "'1970-01-01T01:01:01'"
  t.deepEqual(output, expected)
})

test('it should handle a date value in oracle dialects', async t => {
  const output = maybeQuote('1970-01-01T01:01:01', 'oracle')
  const expected = "TIMESTAMP '1970-01-01 01:01:01 UTC'"
  t.deepEqual(output, expected)
})

test('it should handle a buffer input', async t => {
  const output = maybeQuote(
    Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]),
    'postgres'
  )
  const expected = "X'627566666572'"
  t.deepEqual(output, expected)
})

test('it should handle a string with no special characters', async t => {
  const output = maybeQuote('string', 'postgres')
  const expected = "'string'"
  t.deepEqual(output, expected)
})

test('it should escape quotes', async t => {
  const output = maybeQuote("'string'")
  const expected = "'''string'''"
  t.deepEqual(output, expected)
})

test('it should escape backslashes', async t => {
  const output = maybeQuote("string/'string'")
  const expected = "'string/''string'''"
  t.deepEqual(output, expected)
})
