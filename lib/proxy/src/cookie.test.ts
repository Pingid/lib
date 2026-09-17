import { expect, test } from 'vitest'

import { CookieSet, SetCookie, SetCookiePolicy } from './cookie.ts'

const apply = (policy: SetCookiePolicy, raw: string) => policy.applyTo(SetCookie.parse(raw))?.toString() ?? null

test('a parsed cookie round-trips, with its attribute names canonicalised', () => {
  expect(SetCookie.parse('a=1; path=/; HTTPONLY; samesite=lax').toString()).toBe('a=1; Path=/; HttpOnly; SameSite=lax')
})

test('a cookie can be built from nothing, not only parsed', () => {
  expect(SetCookie.of('a', '1').set('Path', '/').toString()).toBe('a=1; Path=/')
})

test('domain(null) drops Domain, and a pattern only drops the one it names', () => {
  expect(apply(SetCookiePolicy.create().domain(null), 'a=1; Domain=app; Path=/')).toBe('a=1; Path=/')
  expect(apply(SetCookiePolicy.create().domain(null, 'other'), 'a=1; Domain=app')).toBe('a=1; Domain=app')
  expect(apply(SetCookiePolicy.create().domain(null, /^app$/), 'a=1; Domain=.app')).toBe('a=1')
})

test('pathPrefix re-roots a path under the proxy', () => {
  expect(apply(SetCookiePolicy.create().pathPrefix('/base', '/proxy/web'), 'a=1; Path=/base/x')).toBe(
    'a=1; Path=/proxy/web/x',
  )
})

test('pathPrefix leaves a cookie that never named a path alone', () => {
  expect(apply(SetCookiePolicy.create().pathPrefix('/base', '/proxy/web'), 'b=2; HttpOnly')).toBe('b=2; HttpOnly')
})

test('secureFor(false) drops Secure and downgrades the SameSite that needed it', () => {
  const http = SetCookiePolicy.create().secureFor(false)
  expect(apply(http, 'a=1; Domain=app; Path=/; Secure')).toBe('a=1; Domain=app; Path=/')
  expect(apply(http, 'a=1; SameSite=None')).toBe('a=1; SameSite=Lax')
})

test('secureFor(true) leaves the cookie exactly as the upstream set it', () => {
  const https = SetCookiePolicy.create().secureFor(true)
  expect(apply(https, 'a=1; Domain=app; Path=/; Secure')).toBe('a=1; Domain=app; Path=/; Secure')
  expect(apply(https, 'a=1; SameSite=None')).toBe('a=1; SameSite=None')
})

test('harden only ever tightens, and SameSite=None brings Secure with it', () => {
  expect(apply(SetCookiePolicy.create().harden({ httpOnly: true }), 'a=1')).toBe('a=1; Secure; HttpOnly')
  expect(apply(SetCookiePolicy.create().harden({ secure: false, sameSite: 'None' }), 'a=1')).toBe(
    'a=1; SameSite=None; Secure',
  )
})

test('harden with maxAge drops the Expires it would have contradicted', () => {
  expect(apply(SetCookiePolicy.create().harden({ maxAge: 60 }), 'a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT')).toBe(
    'a=1; Secure; Max-Age=60',
  )
})

test('capMaxAge caps a long life but does not extend a short one', () => {
  expect(apply(SetCookiePolicy.create().capMaxAge(60), 'a=1; Max-Age=3600')).toBe('a=1; Max-Age=60')
  expect(apply(SetCookiePolicy.create().capMaxAge(60), 'a=1; Max-Age=30')).toBe('a=1; Max-Age=30')
  expect(apply(SetCookiePolicy.create().capMaxAge(60), 'a=1')).toBe('a=1; Max-Age=60')
})

test('excludeNames drops by exact name and by pattern, and keeps the rest', () => {
  const policy = SetCookiePolicy.create().excludeNames('session', /^_ga/)
  expect(apply(policy, 'session=1')).toBe(null)
  expect(apply(policy, '_gat=1')).toBe(null)
  expect(apply(policy, 'keep=1')).toBe('keep=1')
})

test('a dropped cookie skips the steps that follow it', () => {
  let seen = false
  const policy = SetCookiePolicy.create()
    .excludeNames('session')
    .map((cookie) => {
      seen = true
      return cookie
    })
  expect(apply(policy, 'session=1')).toBe(null)
  expect(seen).toBe(false)
})

test('rename and prefixNames rewrite the name, not the value', () => {
  expect(apply(SetCookiePolicy.create().rename('a', 'b'), 'a=1')).toBe('b=1')
  expect(apply(SetCookiePolicy.create().prefixNames('up_'), 'a=1')).toBe('up_a=1')
})

test('a cookie header parses, filters and prints back as a list', () => {
  const set = CookieSet.parse('session=1; keep=2; _gat=3')
  expect(set.get('keep')).toBe('2')
  expect(set.size).toBe(3)
  expect(set.exclude('session', /^_ga/).toString()).toBe('keep=2')
})

test('a cookie header renames a pair in place and keeps valueless entries', () => {
  expect(CookieSet.parse('a=1; b').rename('a', 'c').toString()).toBe('c=1; b')
})
