import { expect, expectTypeOf, test } from 'vitest'

import { Path } from './path.ts'

const match = (pattern: string, pathname: string) => Path.match(Path.compile(pattern), pathname)

// ---------------- types --------------------------

test('a literal path yields one key per parameter', () => {
  expectTypeOf<Path.Keys<'/users/:id'>>().toEqualTypeOf<'id'>()
  expectTypeOf<Path.Keys<'/foo/:a/:b'>>().toEqualTypeOf<'a' | 'b'>()
  expectTypeOf<Path.Keys<'/users'>>().toEqualTypeOf<never>()
  expectTypeOf<Path.Keys<'/users/:id/'>>().toEqualTypeOf<'id'>()
})

test('a trailing marker and a regex constraint are stripped from the name', () => {
  expectTypeOf<Path.Keys<'/u/:id?'>>().toEqualTypeOf<'id'>()
  expectTypeOf<Path.Keys<'/u/:id{\\d+}'>>().toEqualTypeOf<'id'>()
  expectTypeOf<Path.Keys<'/u/:id{\\d+}?'>>().toEqualTypeOf<'id'>()
})

test('an optional parameter becomes an optional key, not a required one', () => {
  expectTypeOf<Path.Shape<'/users/:id'>>().toEqualTypeOf<{ id: string }>()
  expectTypeOf<Path.Shape<'/u/:id?'>>().toEqualTypeOf<{ id?: string }>()
  expectTypeOf<Path.Shape<'/u/:id{a?b}'>>().toEqualTypeOf<{ id: string }>()
  expectTypeOf<Path.Shape<'/files/*'>>().toEqualTypeOf<{ '*'?: string }>()
})

test('a mid-segment colon is not a parameter, because neither framework routes one', () => {
  expectTypeOf<Path.Keys<'/v:version'>>().toEqualTypeOf<never>()
})

test('a non-literal path disables the check rather than reporting every key unbound', () => {
  expectTypeOf<Path.Keys<string>>().toEqualTypeOf<never>()
  expectTypeOf<Path.Shape<string>>().toEqualTypeOf<Record<string, any>>()
})

// ---------------- runtime --------------------------

test('a parameter captures one segment and is url-decoded', () => {
  expect(match('/users/:id', '/users/42')).toEqual({ id: '42' })
  expect(match('/users/:id', '/users/a%20b')).toEqual({ id: 'a b' })
  expect(match('/users/:id', '/users/a/b')).toBeUndefined()
})

test('a trailing slash matches, and a different path does not', () => {
  expect(match('/users/:id', '/users/42/')).toEqual({ id: '42' })
  expect(match('/users/:id', '/accounts/42')).toBeUndefined()
  expect(match('/users', '/users')).toEqual({})
})

test('an absent optional parameter is omitted, never set to undefined', () => {
  const found = match('/u/:id?', '/u')
  expect(found).toEqual({})
  expect(found && 'id' in found).toBe(false)
  expect(match('/u/:id?', '/u/7')).toEqual({ id: '7' })
})

test('a regex constraint restricts what the segment accepts', () => {
  expect(match('/u/:id{\\d+}', '/u/42')).toEqual({ id: '42' })
  expect(match('/u/:id{\\d+}', '/u/abc')).toBeUndefined()
})

test('a catch-all captures the rest of the path, including slashes', () => {
  expect(match('/files/*', '/files/a/b/c')).toEqual({ '*': 'a/b/c' })
  expect(match('/files/*', '/files')).toEqual({})
})

test('a static segment carrying a regex metacharacter is escaped, not treated as a pattern', () => {
  expect(match('/v1.0/:id', '/v1.0/7')).toEqual({ id: '7' })
  expect(match('/v1.0/:id', '/v1X0/7')).toBeUndefined()
})

test('keys reports the declared parameter names in order', () => {
  expect(Path.keys('/orgs/:org/repos/:repo')).toEqual(['org', 'repo'])
  expect(Path.keys('/u/:id{\\d+}?')).toEqual(['id'])
  expect(Path.keys('/files/*')).toEqual(['*'])
})
