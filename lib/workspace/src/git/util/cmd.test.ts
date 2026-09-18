import { expect, test } from 'vitest'

import { flag, positional, to_args, value } from './cmd.ts'

const Opts = {
  message: value(),
  depth: value<number>('--depth'),
  amend: flag(),
  no_edit: flag(),
  create: value('-b'),
  name: positional(),
  paths: positional<string[]>(),
}

test('a flag is emitted when set and omitted when unset or explicitly false', () => {
  expect(to_args(Opts, { amend: true })).toEqual(['--amend'])
  expect(to_args(Opts, {})).toEqual([])
  expect(to_args(Opts, { amend: false })).toEqual([])
})

test('underscores become dashes, and an explicit switch is used verbatim', () => {
  expect(to_args(Opts, { no_edit: true })).toEqual(['--no-edit'])
  expect(to_args(Opts, { create: 'topic' })).toEqual(['-b', 'topic'])
})

test('a value carries its argument, including a non-string one', () => {
  expect(to_args(Opts, { message: 'hello world' })).toEqual(['--message', 'hello world'])
  expect(to_args(Opts, { depth: 1 })).toEqual(['--depth', '1'])
})

test('positionals come after every switch, in declaration order', () => {
  expect(to_args(Opts, { name: 'v1', amend: true, message: 'm' })).toEqual(['--message', 'm', '--amend', 'v1'])
})

test('a list positional is spread, and an empty one contributes nothing', () => {
  expect(to_args(Opts, { paths: ['a', 'b'] })).toEqual(['a', 'b'])
  expect(to_args(Opts, { paths: [] })).toEqual([])
})

test('the order follows the declaration, not the order options were set', () => {
  expect(to_args(Opts, { amend: true, message: 'm' })).toEqual(to_args(Opts, { message: 'm', amend: true }))
})

test('undefined is skipped and undeclared keys never reach the command line', () => {
  expect(to_args(Opts, { message: undefined, name: 'v1' })).toEqual(['v1'])
  expect(to_args(Opts, { cwd: '/tmp', bogus: true } as never)).toEqual([])
})
