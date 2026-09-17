import { describe, expect, test } from 'vitest'
import {
  createProxy,
  forward,
  match,
  ProxyError,
  requestHeaders,
  responseHeaders,
  rewriteCookie,
  rewriteLocation,
  route,
  toProxy,
  toUpstream,
} from './index.ts'

const r = route('/proxy/web', 'http://app:3000')
const based = route('/proxy/web', 'http://app:3000/base/')
const tls = route('/proxy/web', 'http://app:3000', true)

describe('match', () => {
  test('captures params and hands back the tail', () => {
    expect(match('/proxy/:name', '/proxy/web/assets/app.js')).toEqual({
      prefix: '/proxy/web',
      path: '/assets/app.js',
      params: { name: 'web' },
    })
  })

  test('keeps a trailing slash', () => {
    expect(match('/proxy/:name', '/proxy/web/docs/')?.path).toBe('/docs/')
  })

  test('normalises an exhausted path to /', () => {
    expect(match('/proxy/:name', '/proxy/web')?.path).toBe('/')
  })

  test('does not match partial segments or short paths', () => {
    expect(match('/proxy/:name', '/proxyx/web')).toBeNull()
    expect(match('/proxy/:name', '/proxy')).toBeNull()
    expect(match('/proxy/:name', '/proxy/')).toBeNull()
  })

  test('decodes params', () => {
    expect(match('/at/:id', '/at/a%2Fb')?.params['id']).toBe('a/b')
  })

  test('an empty pattern matches everything', () => {
    expect(match('/', '/a/b')).toEqual({ prefix: '', path: '/a/b', params: {} })
  })
})

describe('url mapping', () => {
  test('round-trips through the upstream and back', () => {
    expect(toUpstream(r, '/a/b', '?q=1').href).toBe('http://app:3000/a/b?q=1')
    expect(toProxy(r, '/a/b')).toBe('/proxy/web/a/b')
  })

  test('honours an upstream base path in both directions', () => {
    expect(toUpstream(based, '/a').href).toBe('http://app:3000/base/a')
    expect(toProxy(based, '/base/a')).toBe('/proxy/web/a')
    expect(toProxy(based, '/base')).toBe('/proxy/web/')
  })

  test('cannot climb out of the base path', () => {
    expect(toUpstream(based, '/../../etc').href).toBe('http://app:3000/etc')
  })
})

describe('requestHeaders', () => {
  const headers = (init: HeadersInit) =>
    requestHeaders(new Headers(init), r, 'proxy.test', { cookies: ['session', /^_ga/] })

  test('drops hop-by-hop, host and content-length', () => {
    const out = headers({
      connection: 'keep-alive',
      upgrade: 'h2c',
      host: 'proxy.test',
      'content-length': '12',
      accept: 'text/html',
    })
    for (const k of ['connection', 'upgrade', 'host', 'content-length']) expect(out.has(k)).toBe(false)
    expect(out.get('accept')).toBe('text/html')
  })

  test('sets the forwarded triple', () => {
    const out = headers({})
    expect(out.get('x-forwarded-host')).toBe('proxy.test')
    expect(out.get('x-forwarded-proto')).toBe('http')
    expect(out.get('x-forwarded-prefix')).toBe('/proxy/web')
    expect(requestHeaders(new Headers(), tls, null).get('x-forwarded-proto')).toBe('https')
  })

  test('filters cookies by name', () => {
    expect(headers({ cookie: 'session=1; keep=2; _gat=3' }).get('cookie')).toBe('keep=2')
    expect(headers({ cookie: 'session=1' }).has('cookie')).toBe(false)
  })

  test('leaves cookies alone without a filter', () => {
    const out = requestHeaders(new Headers({ cookie: 'session=1' }), r, null)
    expect(out.get('cookie')).toBe('session=1')
  })

  test('points referer and origin back at the upstream', () => {
    const out = headers({
      referer: 'https://proxy.test/proxy/web/page?x=1',
      origin: 'https://proxy.test',
    })
    expect(out.get('referer')).toBe('http://app:3000/page?x=1')
    expect(out.get('origin')).toBe('http://app:3000')
  })

  test('leaves a foreign referer untouched', () => {
    expect(headers({ referer: 'https://elsewhere.test/x' }).get('referer')).toBe('https://elsewhere.test/x')
  })
})

describe('responseHeaders', () => {
  test('drops framing, transport and origin claims', () => {
    const out = responseHeaders(
      new Headers({
        'x-frame-options': 'DENY',
        'content-security-policy': "default-src 'none'",
        'strict-transport-security': 'max-age=1',
        'content-encoding': 'gzip',
        'content-length': '9',
        'content-type': 'text/html',
      }),
      r,
    )
    const kept: string[] = []
    out.forEach((_, k) => kept.push(k))
    expect(kept).toEqual(['content-type'])
  })

  test('rewrites every set-cookie', () => {
    const from = new Headers()
    from.append('set-cookie', 'a=1; Domain=app; Secure; SameSite=None')
    from.append('set-cookie', 'b=2; HttpOnly')
    expect(responseHeaders(from, r).getSetCookie()).toEqual(['a=1; SameSite=Lax', 'b=2; HttpOnly'])
  })
})

describe('rewriteLocation', () => {
  test('pulls absolute paths and upstream URLs back under the prefix', () => {
    expect(rewriteLocation('/login', r)).toBe('/proxy/web/login')
    expect(rewriteLocation('http://app:3000/login?next=/a#f', r)).toBe('/proxy/web/login?next=/a#f')
    expect(rewriteLocation('/base/login', based)).toBe('/proxy/web/login')
  })

  test('leaves relative, protocol-relative and foreign targets alone', () => {
    expect(rewriteLocation('login', r)).toBe('login')
    expect(rewriteLocation('//cdn.test/x', r)).toBe('//cdn.test/x')
    expect(rewriteLocation('https://auth.test/x', r)).toBe('https://auth.test/x')
  })
})

describe('rewriteCookie', () => {
  test('strips Domain, and Secure only over plain http', () => {
    expect(rewriteCookie('a=1; Domain=app; Path=/; Secure', r)).toBe('a=1; Path=/')
    expect(rewriteCookie('a=1; Domain=app; Path=/; Secure', tls)).toBe('a=1; Path=/; Secure')
  })

  test('downgrades SameSite=None it can no longer honour', () => {
    expect(rewriteCookie('a=1; SameSite=None', r)).toBe('a=1; SameSite=Lax')
    expect(rewriteCookie('a=1; SameSite=None', tls)).toBe('a=1; SameSite=None')
  })
})

describe('forward', () => {
  const upstream = Bun.serve({
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)
      if (url.pathname === '/redirect') return new Response(null, { status: 302, headers: { location: '/done' } })
      if (url.pathname === '/echo')
        return new Response(await request.text(), {
          headers: { 'x-seen-prefix': request.headers.get('x-forwarded-prefix') ?? '' },
        })
      if (url.pathname === '/empty') return new Response(null, { status: 204 })
      return new Response(url.pathname + url.search, {
        headers: { 'x-frame-options': 'DENY', 'set-cookie': 's=1; Domain=app; Secure' },
      })
    },
  })
  const live = route('/proxy/web', upstream.url.origin)
  const get = (path: string) => new Request(`http://proxy.test${path}`)

  test('forwards path and query, rewriting the response', async () => {
    const res = await forward(get('/proxy/web/a/b?q=1'), live)
    expect(await res.text()).toBe('/a/b?q=1')
    expect(res.headers.has('x-frame-options')).toBe(false)
    expect(res.headers.getSetCookie()).toEqual(['s=1'])
  })

  test('serves the bare mount point and preserves percent-encoding', async () => {
    expect(await (await forward(get('/proxy/web'), live)).text()).toBe('/')
    expect(await (await forward(get('/proxy/web/a%20b%2Fc'), live)).text()).toBe('/a%20b%2Fc')
  })

  test('streams a request body and passes extra headers', async () => {
    const res = await forward(
      new Request('http://proxy.test/proxy/web/echo', { method: 'POST', body: 'hello' }),
      live,
      { headers: { 'x-forwarded-for': '1.2.3.4' } },
    )
    expect(await res.text()).toBe('hello')
    expect(res.headers.get('x-seen-prefix')).toBe('/proxy/web')
  })

  test('passes redirects through, rewritten, without following them', async () => {
    const res = await forward(get('/proxy/web/redirect'), live)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/proxy/web/done')
  })

  test('survives a bodiless status', async () => {
    expect((await forward(get('/proxy/web/empty'), live)).status).toBe(204)
  })

  test('turns an unreachable upstream into a ProxyError', async () => {
    const dead = route('/proxy/web', 'http://127.0.0.1:1')
    const error = await forward(get('/proxy/web/'), dead).catch((e) => e)
    expect(error).toBeInstanceOf(ProxyError)
    expect(error.response.status).toBe(502)
  })

  test('createProxy declines on a resolver miss and maps gateway errors', async () => {
    const handler = createProxy({
      mounts: [{ pattern: '/proxy/:name', upstream: ({ name }) => (name === 'web' ? live.upstream : null) }],
      notFound: () => new Response('no route', { status: 404 }),
    })
    expect(await (await handler(get('/proxy/web/x'))).text()).toBe('/x')
    expect(await (await handler(get('/proxy/other/x'))).text()).toBe('no route')

    const broken = createProxy({ mounts: [{ pattern: '/p', upstream: 'http://127.0.0.1:1' }] })
    expect((await broken(get('/p/x'))).status).toBe(502)
  })
})
