import { describe, expect, test } from 'vitest'

import { tokenize } from './token.ts'

const kinds = (argv: string[]): string[] => tokenize(argv).map((token) => token.kind)

describe('tokenize', () => {
  test('one token per argv element, with matching indices', () => {
    const argv = ['a', '--b', '-c', '--', '-d', '']
    expect(tokenize(argv)).toHaveLength(argv.length)
    expect(tokenize(argv).map((token) => token.index)).toEqual([0, 1, 2, 3, 4, 5])
    expect(tokenize(argv).map((token) => token.text)).toEqual(argv)
  })

  test('splits a long flag on the first `=`', () => {
    expect(tokenize(['--env'])[0]).toMatchObject({ kind: 'long', name: 'env', inline: undefined })
    expect(tokenize(['--env=dev'])[0]).toMatchObject({ kind: 'long', name: 'env', inline: 'dev' })
    expect(tokenize(['--env='])[0]).toMatchObject({ kind: 'long', name: 'env', inline: '' })
    expect(tokenize(['--env=a=b'])[0]).toMatchObject({ kind: 'long', name: 'env', inline: 'a=b' })
  })

  test('keeps a short cluster whole, with any inline value split off', () => {
    expect(tokenize(['-abc'])[0]).toMatchObject({ kind: 'short', body: 'abc', inline: undefined })
    expect(tokenize(['-n5'])[0]).toMatchObject({ kind: 'short', body: 'n5', inline: undefined })
    expect(tokenize(['-n=5'])[0]).toMatchObject({ kind: 'short', body: 'n', inline: '5' })
  })

  test('a numeric-looking token is an operand, not a short cluster', () => {
    expect(kinds(['-5', '-.5', '-0'])).toEqual(['operand', 'operand', 'operand'])
  })

  test('a bare dash is an operand', () => {
    expect(kinds(['-'])).toEqual(['operand'])
  })

  test('`--` terminates, and everything after it is an operand', () => {
    expect(kinds(['--', '--force', '-abc', 'x'])).toEqual(['terminator', 'operand', 'operand', 'operand'])
    expect(tokenize(['--', '-x'])[1]).toMatchObject({ terminated: true })
    expect(tokenize(['-x', '--'])[0]).toMatchObject({ kind: 'short' })
  })

  test('a second `--` after the first is an operand', () => {
    expect(kinds(['--', '--'])).toEqual(['terminator', 'operand'])
  })

  // Preserved from `parse.ts` rather than fixed here — changing them is its own change.
  test('an empty name or body survives, for the parser to no-op on', () => {
    expect(tokenize(['--=x'])[0]).toMatchObject({ kind: 'long', name: '', inline: 'x' })
    expect(tokenize(['-=x'])[0]).toMatchObject({ kind: 'short', body: '', inline: 'x' })
    expect(tokenize(['---x'])[0]).toMatchObject({ kind: 'long', name: '-x' })
  })

  test('an empty string is an operand', () => {
    expect(tokenize([''])[0]).toMatchObject({ kind: 'operand', text: '' })
  })
})
