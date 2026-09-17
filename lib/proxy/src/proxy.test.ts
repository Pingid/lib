import { expect, test } from 'vitest'

import { Policy, ProxyError, proxy } from './index.ts'

/** An upstream that answers from a function, so the suite needs no socket. */
const stub = (handler: (request: Request) => Response | Promise<Response>) => async (request: Request) =>
  handler(request)

/** Answers with the path and query it was asked for, so the mapping is visible. */
const echoUrl = stub((request) => {
  const url = new URL(request.url)
  return new Response(url.pathname + url.search)
})

const get = (path: string) => new Request(`http://proxy.test${path}`)

test('forwards the path and query under the mount point', async () => {
  const handler = proxy({ origin: 'http://app:3000', stripPrefix: '/proxy/web', fetch: echoUrl })
  expect(await (await handler(get('/proxy/web/a/b?q=1'))).text()).toBe('/a/b?q=1')
})

test('serves the bare mount point as the upstream root', async () => {
  const handler = proxy({ origin: 'http://app:3000', stripPrefix: '/proxy/web', fetch: echoUrl })
  expect(await (await handler(get('/proxy/web'))).text()).toBe('/')
})

test('preserves percent-encoding rather than decoding it into the path', async () => {
  const handler = proxy({ origin: 'http://app:3000', stripPrefix: '/proxy/web', fetch: echoUrl })
  expect(await (await handler(get('/proxy/web/a%20b%2Fc'))).text()).toBe('/a%20b%2Fc')
})

test('a client cannot climb out of the upstream base path', async () => {
  const handler = proxy({ origin: 'http://app:3000/base', stripPrefix: '/proxy/web', fetch: echoUrl })
  expect(await (await handler(get('/proxy/web/../../etc'))).text()).toBe('/base/etc')
  expect(await (await handler(get('/proxy/web/a/../../../etc'))).text()).toBe('/base/etc')
})

test('an upstream base path is prepended to what the client asked for', async () => {
  const handler = proxy({ origin: 'http://app:3000/base', stripPrefix: '/proxy/web', fetch: echoUrl })
  expect(await (await handler(get('/proxy/web/a'))).text()).toBe('/base/a')
})

test('streams a request body through rather than buffering it', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('hello'))
      controller.close()
    },
  })
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: stub(async (request) => new Response(await request.text())),
  })
  const request = new Request('http://proxy.test/echo', { method: 'POST', body, duplex: 'half' } as RequestInit)
  expect(await (await handler(request)).text()).toBe('hello')
})

test('a redirect is passed through rewritten, not followed', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    stripPrefix: '/proxy/web',
    fetch: stub(() => new Response(null, { status: 302, headers: { location: '/done' } })),
  })
  const response = await handler(get('/proxy/web/redirect'))
  expect(response.status).toBe(302)
  expect(response.headers.get('location')).toBe('/proxy/web/done')
})

test('an absolute Location on the upstream comes back as a proxy path', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    stripPrefix: '/proxy/web',
    fetch: stub(() => new Response(null, { status: 302, headers: { location: 'http://app:3000/login?next=/a' } })),
  })
  expect((await handler(get('/proxy/web/x'))).headers.get('location')).toBe('/proxy/web/login?next=/a')
})

test('a Location pointing somewhere else is left to go there', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    stripPrefix: '/proxy/web',
    fetch: stub(() => new Response(null, { status: 302, headers: { location: 'https://auth.test/x' } })),
  })
  expect((await handler(get('/proxy/web/x'))).headers.get('location')).toBe('https://auth.test/x')
})

test('survives a status that is not allowed to carry a body', async () => {
  const handler = proxy({ origin: 'http://app:3000', fetch: stub(() => new Response(null, { status: 204 })) })
  const response = await handler(get('/empty'))
  expect(response.status).toBe(204)
  expect(response.body).toBe(null)
})

test('transport headers do not survive, because the body they described did not', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: stub(
      () =>
        new Response('hi', {
          headers: { 'content-encoding': 'gzip', 'content-length': '9', 'content-type': 'text/html' },
        }),
    ),
  })
  const response = await handler(get('/'))
  expect(response.headers.has('content-encoding')).toBe(false)
  expect(response.headers.has('content-length')).toBe(false)
  expect(response.headers.get('content-type')).toBe('text/html')
})

test("the upstream's own security headers are left for it to decide", async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: stub(() => new Response('hi', { headers: { 'x-frame-options': 'DENY' } })),
  })
  expect((await handler(get('/'))).headers.get('x-frame-options')).toBe('DENY')
})

test('records the client, the host it asked for, and the mount point', async () => {
  let seen = new Headers()
  const handler = proxy({
    origin: 'http://app:3000',
    stripPrefix: '/proxy/web',
    fetch: stub((request) => {
      seen = request.headers
      return new Response('ok')
    }),
  })
  await handler(get('/proxy/web/a'), { clientIp: '1.2.3.4' })
  expect(seen.get('x-forwarded-for')).toBe('1.2.3.4')
  expect(seen.get('x-forwarded-host')).toBe('proxy.test')
  expect(seen.get('x-forwarded-proto')).toBe('http')
  expect(seen.get('x-forwarded-prefix')).toBe('/proxy/web')
})

test('an untrusted peer does not get to say where the request came from', async () => {
  let seen = new Headers()
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: stub((request) => {
      seen = request.headers
      return new Response('ok')
    }),
  })
  const forged = new Request('http://proxy.test/', { headers: { 'x-forwarded-for': '9.9.9.9', via: '1.1 forged' } })
  await handler(forged, { clientIp: '1.2.3.4' })
  expect(seen.get('x-forwarded-for')).toBe('1.2.3.4')
  expect(seen.has('via')).toBe(false)
})

test('a trusted peer has its chain extended rather than discarded', async () => {
  let seen = new Headers()
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: stub((request) => {
      seen = request.headers
      return new Response('ok')
    }),
  })
  const chained = new Request('http://proxy.test/', { headers: { 'x-forwarded-for': '9.9.9.9' } })
  await handler(chained, { clientIp: '1.2.3.4', trustedPeer: true })
  expect(seen.get('x-forwarded-for')).toBe('9.9.9.9, 1.2.3.4')
})

test('referer and origin are pointed at the upstream that has to understand them', async () => {
  let seen = new Headers()
  const handler = proxy({
    origin: 'http://app:3000',
    stripPrefix: '/proxy/web',
    fetch: stub((request) => {
      seen = request.headers
      return new Response('ok')
    }),
  })
  const request = new Request('http://proxy.test/proxy/web/a', {
    headers: { referer: 'http://proxy.test/proxy/web/page?x=1', origin: 'http://proxy.test' },
  })
  await handler(request)
  expect(seen.get('referer')).toBe('http://app:3000/page?x=1')
  expect(seen.get('origin')).toBe('http://app:3000')
})

test('a referer from another site is left as it was', async () => {
  let seen = new Headers()
  const handler = proxy({
    origin: 'http://app:3000',
    stripPrefix: '/proxy/web',
    fetch: stub((request) => {
      seen = request.headers
      return new Response('ok')
    }),
  })
  await handler(new Request('http://proxy.test/proxy/web/a', { headers: { referer: 'https://elsewhere.test/x' } }))
  expect(seen.get('referer')).toBe('https://elsewhere.test/x')
})

const cookieUpstream = stub(
  () => new Response('ok', { headers: { 'set-cookie': 'a=1; Domain=app; Secure; SameSite=None' } }),
)

test('a cookie the client could not keep is fitted to the leg it arrived on', async () => {
  const handler = proxy({ origin: 'http://app:3000', fetch: cookieUpstream })
  expect((await handler(new Request('http://proxy.test/'))).headers.getSetCookie()).toEqual(['a=1; SameSite=Lax'])
})

test('over TLS the cookie keeps everything but the domain it named', async () => {
  const handler = proxy({ origin: 'http://app:3000', fetch: cookieUpstream })
  expect((await handler(new Request('https://proxy.test/'))).headers.getSetCookie()).toEqual([
    'a=1; Secure; SameSite=None',
  ])
})

test('a cookie is re-rooted under the mount point, not left at the upstream root', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    stripPrefix: '/proxy/web',
    fetch: stub(() => new Response('ok', { headers: { 'set-cookie': 's=1; Path=/' } })),
  })
  expect((await handler(get('/proxy/web/a'))).headers.getSetCookie()).toEqual(['s=1; Path=/proxy/web'])
})

test('rewriteBack: false hands the upstream response back as it came', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    stripPrefix: '/proxy/web',
    rewriteBack: false,
    fetch: stub(() => new Response('ok', { headers: { location: '/login', 'set-cookie': 'a=1; Domain=app' } })),
  })
  const response = await handler(get('/proxy/web/x'))
  expect(response.headers.get('location')).toBe('/login')
  expect(response.headers.getSetCookie()).toEqual(['a=1; Domain=app'])
})

test('an upstream that cannot be reached becomes a gateway error', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: () => Promise.reject(new TypeError('fetch failed')),
  })
  const response = await handler(get('/'))
  expect(response.status).toBe(502)
  expect(await response.text()).toContain('http://app:3000')
})

test('a client that hangs up is not a gateway failure', async () => {
  const controller = new AbortController()
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: () => {
      controller.abort()
      return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
    },
  })
  const request = new Request('http://proxy.test/', { signal: controller.signal })
  await expect(handler(request)).rejects.toThrow(/aborted/i)
})

test('an upstream that never answers becomes a timeout', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    timeout: 5,
    fetch: (request) =>
      new Promise((_resolve, reject) => {
        request.signal.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        )
      }),
  })
  const response = await handler(get('/'))
  expect(response.status).toBe(504)
})

test('a policy that refuses the request answers with its own status', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    request: Policy.request().readOnly(),
    fetch: echoUrl,
  })
  expect((await handler(get('/'))).status).toBe(200)
  const response = await handler(new Request('http://proxy.test/', { method: 'POST' }))
  expect(response.status).toBe(405)
  expect(await response.text()).toContain('POST')
})

test('onError takes over the conversion when one is given', async () => {
  let caught: unknown
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: () => Promise.reject(new TypeError('fetch failed')),
    onError: (error) => {
      caught = error
      return new Response('down', { status: 503 })
    },
  })
  const response = await handler(get('/'))
  expect(response.status).toBe(503)
  expect(caught).toBeInstanceOf(ProxyError)
})

test('the request policy runs after retargeting, so it sees the upstream URL', async () => {
  let seen = ''
  const handler = proxy({
    origin: 'http://app:3000',
    stripPrefix: '/proxy/web',
    request: Policy.request().inspect((request) => {
      seen = request.url
    }),
    fetch: echoUrl,
  })
  await handler(get('/proxy/web/a'))
  expect(seen).toBe('http://app:3000/a')
})

test('the response policy sees what the client is about to get', async () => {
  const handler = proxy({
    origin: 'http://app:3000',
    response: Policy.response().status((status) => (status === 404 ? 410 : status)),
    fetch: stub(() => new Response('gone', { status: 404 })),
  })
  expect((await handler(get('/'))).status).toBe(410)
})

test('setHost sends the upstream its own name', async () => {
  let seen: string | null = null
  const handler = proxy({
    origin: 'http://app:3000',
    setHost: true,
    fetch: stub((request) => {
      seen = request.headers.get('host')
      return new Response('ok')
    }),
  })
  await handler(get('/'))
  expect(seen).toBe('app:3000')
})

test('context reaches a policy step, and the caller’s object is not written to', async () => {
  let seen: unknown
  const context = { clientIp: '1.2.3.4' }
  const handler = proxy({
    origin: 'http://app:3000',
    request: Policy.request().inspect((_request, ctx) => {
      seen = ctx['tenant']
    }),
    fetch: echoUrl,
  })
  await handler(get('/'), { ...context, tenant: 'acme' })
  expect(seen).toBe('acme')
  expect(context).toEqual({ clientIp: '1.2.3.4' })
})

test('the configured fetch is used instead of the global one', async () => {
  let called = false
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: stub(() => {
      called = true
      return new Response('ok')
    }),
  })
  await handler(get('/'))
  expect(called).toBe(true)
})

test('hop-by-hop headers are dropped in both directions', async () => {
  let seen = new Headers()
  const handler = proxy({
    origin: 'http://app:3000',
    fetch: stub((request) => {
      seen = request.headers
      return new Response('ok', { headers: { connection: 'keep-alive', 'keep-alive': 'timeout=5' } })
    }),
  })
  const response = await handler(new Request('http://proxy.test/', { headers: { te: 'trailers' } }))
  expect(seen.has('te')).toBe(false)
  expect(response.headers.has('keep-alive')).toBe(false)
})
