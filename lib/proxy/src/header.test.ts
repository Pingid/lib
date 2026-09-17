import { expect, test } from 'vitest'

import { SetCookie, SetCookiePolicy } from './cookie.ts'
import { HeaderPolicy } from './header.ts'

const names = (headers: Headers) => {
  const out: string[] = []
  headers.forEach((_, name) => out.push(name))
  return out.sort()
}

test('hop-by-hop headers do not survive the hop', () => {
  const out = HeaderPolicy.create()
    .excludeHopByHop()
    .copyOf({ connection: 'keep-alive', upgrade: 'h2c', te: 'trailers', accept: 'text/html' })
  expect(names(out)).toEqual(['accept'])
})

test('a header named by Connection goes with it', () => {
  const out = HeaderPolicy.create()
    .excludeHopByHop()
    .copyOf({ connection: 'x-custom, close', 'x-custom': '1', accept: 'text/html' })
  expect(out.has('x-custom')).toBe(false)
  expect(out.get('accept')).toBe('text/html')
})

test('Connection cannot be used to strip host out from under the proxy', () => {
  const out = HeaderPolicy.create().excludeHopByHop().copyOf({ connection: 'host, close', host: 'proxy.test' })
  expect(out.get('host')).toBe('proxy.test')
})

test('exclude and keep match header names without regard to case', () => {
  expect(HeaderPolicy.create().exclude('X-Gone').copyOf({ 'x-gone': '1', keep: '2' }).has('x-gone')).toBe(false)
  expect(names(HeaderPolicy.create().keep('Accept', /^x-/).copyOf({ accept: '1', 'x-a': '2', other: '3' }))).toEqual([
    'accept',
    'x-a',
  ])
})

test('default sets a header only when the upstream did not', () => {
  expect(HeaderPolicy.create().default('accept', 'text/html').copyOf({}).get('accept')).toBe('text/html')
  expect(HeaderPolicy.create().default('accept', 'text/html').copyOf({ accept: 'json' }).get('accept')).toBe('json')
})

test('request cookies are filtered by name, and the header goes when nothing is left', () => {
  const policy = HeaderPolicy.create().excludeCookies('session', /^_ga/)
  expect(policy.copyOf({ cookie: 'session=1; keep=2; _gat=3' }).get('cookie')).toBe('keep=2')
  expect(policy.copyOf({ cookie: 'session=1' }).has('cookie')).toBe(false)
})

test('cookies are left alone when no filter asked for them', () => {
  expect(HeaderPolicy.create().excludeHopByHop().copyOf({ cookie: 'session=1' }).get('cookie')).toBe('session=1')
})

test('the forwarded family records the client, mount point included', () => {
  const out = HeaderPolicy.create()
    .forwarded({ for: '1.2.3.4', host: 'proxy.test', proto: 'https', port: 443, prefix: '/proxy/web' })
    .copyOf({})
  expect(out.get('x-forwarded-for')).toBe('1.2.3.4')
  expect(out.get('x-forwarded-host')).toBe('proxy.test')
  expect(out.get('x-forwarded-proto')).toBe('https')
  expect(out.get('x-forwarded-port')).toBe('443')
  expect(out.get('x-forwarded-prefix')).toBe('/proxy/web')
})

test('replace discards a chain the client may have forged; append extends one', () => {
  const prior = { 'x-forwarded-for': '9.9.9.9', 'x-forwarded-proto': 'https' }
  const replaced = HeaderPolicy.create().forwarded({ for: '1.2.3.4', proto: 'http' }).copyOf(prior)
  expect(replaced.get('x-forwarded-for')).toBe('1.2.3.4')
  expect(replaced.get('x-forwarded-proto')).toBe('http')

  const appended = HeaderPolicy.create().forwarded({ for: '1.2.3.4', proto: 'http' }, { mode: 'append' }).copyOf(prior)
  expect(appended.get('x-forwarded-for')).toBe('9.9.9.9, 1.2.3.4')
  expect(appended.get('x-forwarded-proto')).toBe('https')
})

test('the RFC 7239 form is opt-in, and brackets an IPv6 address', () => {
  expect(HeaderPolicy.create().forwarded({ for: '1.2.3.4' }).copyOf({}).has('forwarded')).toBe(false)
  const out = HeaderPolicy.create()
    .forwarded({ for: '::1', host: 'proxy.test', proto: 'https' }, { standard: true })
    .copyOf({})
  expect(out.get('forwarded')).toBe('for="[::1]";host=proxy.test;proto=https')
})

test('via appends an entry rather than replacing the chain', () => {
  expect(HeaderPolicy.create().via('edge-1').copyOf({ via: '1.1 edge-0' }).get('via')).toBe('1.1 edge-0, 1.1 edge-1')
})

test('mapUrls rewrites the URL-valued headers, and null drops one', () => {
  const out = HeaderPolicy.create()
    .mapUrls((value) => (value === '/gone' ? null : `/proxy${value}`))
    .copyOf({ location: '/login', 'content-location': '/gone' })
  expect(out.get('location')).toBe('/proxy/login')
  expect(out.has('content-location')).toBe(false)
})

test('every Set-Cookie is rewritten, not just the first', () => {
  const from = new Headers()
  from.append('set-cookie', 'a=1; Domain=app; Secure')
  from.append('set-cookie', 'b=2; HttpOnly')
  const out = HeaderPolicy.create().setCookies(SetCookiePolicy.create().domain(null)).copyOf(from)
  expect(out.getSetCookie()).toEqual(['a=1; Secure', 'b=2; HttpOnly'])
})

test('setCookies and mapSetCookie agree on the same transform', () => {
  const from = new Headers()
  from.append('set-cookie', 'a=1; Domain=app')
  from.append('set-cookie', 'session=2')
  const viaPolicy = HeaderPolicy.create()
    .setCookies(SetCookiePolicy.create().excludeNames('session').domain(null))
    .copyOf(from)
  const viaMap = HeaderPolicy.create()
    .mapSetCookie((cookie) => {
      if (cookie.name === 'session') return null
      cookie.domain = null
      return cookie
    })
    .copyOf(from)
  expect(viaPolicy.getSetCookie()).toEqual(viaMap.getSetCookie())
  expect(viaPolicy.getSetCookie()).toEqual(['a=1'])
})

test('a Set-Cookie step reads the context it was applied with', () => {
  const policy = HeaderPolicy.create().setCookies(
    SetCookiePolicy.create().map((cookie, context) => {
      cookie.value = String(context['tenant'])
      return cookie
    }),
  )
  expect(policy.copyOf(new Headers({ 'set-cookie': 'a=1' }), { tenant: 'acme' }).getSetCookie()).toEqual(['a=acme'])
})

test('a cookie set is handed to mapCookie as a whole', () => {
  const out = HeaderPolicy.create()
    .mapCookie((set) => set.rename('a', 'b'))
    .copyOf({ cookie: 'a=1; c=2' })
  expect(out.get('cookie')).toBe('b=1; c=2')
})

test('a parsed Set-Cookie keeps attribute order when one is rewritten', () => {
  const cookie = SetCookie.parse('a=1; Domain=app; Path=/; Secure')
  cookie.secure = true
  expect(cookie.toString()).toBe('a=1; Domain=app; Path=/; Secure')
})
