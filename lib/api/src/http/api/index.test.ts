import { Type } from '@sinclair/typebox'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as Route from '../route/index.ts'
import { guard, Router, type Middleware } from './index.ts'

const App = Type.Object({ id: Type.String() })

// ------------------------------------------------------------------
// Providers
// ------------------------------------------------------------------
const calls: string[] = []

const session: Route.Provider<{ uid: string } | null> = (req) => {
  calls.push('session')
  const uid = req.headers.get('x-user')
  return uid ? { uid } : null
}

const user: Route.Provider<{ id: string }> = async (_req, get) => {
  const s = await get(session)
  if (!s) throw new Response('Unauthorized', { status: 401 })
  return { id: s.uid }
}

const apps = Route.once(() => ({ list: async () => [{ id: 'a' }], put: async (id: string) => ({ id }) }))

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------
const List = Route.Route('/apps', {
  method: 'GET',
  response: { 200: { 'application/json': Type.Object({ apps: Type.Array(App) }) } },
  inject: { apps },
  handle: async (c, { apps }) => c.json({ apps: await apps.list() }),
})

const Update = Route.Route('/apps/:slug', {
  method: 'PUT',
  params: Type.Object({ slug: Type.String({ minLength: 2 }) }),
  body: App,
  response: { 200: { 'application/json': Type.Object({ id: Type.String(), by: Type.String() }) } },
  inject: { user, apps },
  handle: async (c, { user, apps }) => {
    const app = await apps.put(c.params.path.slug)
    return c.json({ id: app.id, by: user.id })
  },
})

const Stars = Route.Route('/stars', {
  response: Type.Object({ stars: Type.Integer() }),
  handle: (c, cx: { db: { stars: number } }) => c.json({ stars: cx.db.stars }),
})

const signedIn = guard(async (req) => !!(await Route.inject(req, session)))

const order: string[] = []
const trace =
  (name: string): Middleware =>
  (next) =>
  async (req) => {
    order.push(`>${name}`)
    const res = await next(req)
    order.push(`<${name}`)
    return res
  }

const api = Router({
  prefix: '/api',
  use: [trace('root')],
  routes: [List, Router({ use: [trace('authed'), signedIn], routes: [Update] })],
})

const call = (path: string, init?: RequestInit) => (api.fetch as any)(new Request(`http://localhost${path}`, init))
const put = (path: string, headers: Record<string, string> = { 'x-user': 'dan' }) =>
  call(path, { method: 'PUT', body: JSON.stringify({ id: 'x' }), headers: { 'content-type': 'application/json', ...headers } })

describe('Router', () => {
  it('matches static and dynamic paths under a prefix', async () => {
    expect(await (await call('/api/apps')).json()).toEqual({ apps: [{ id: 'a' }] })
    expect(await (await put('/api/apps/ab')).json()).toEqual({ id: 'ab', by: 'dan' })
    expect((await call('/api/apps/')).status).toBe(200)
  })

  it('answers 404 and 405', async () => {
    expect((await call('/nope')).status).toBe(404)
    const res = await call('/api/apps', { method: 'DELETE' })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('GET')
  })

  it('validates path params', async () => {
    expect((await put('/api/apps/a')).status).toBe(422)
  })

  it('runs middleware outermost first', async () => {
    order.length = 0
    await put('/api/apps/ab')
    expect(order).toEqual(['>root', '>authed', '<authed', '<root'])
  })

  it('stops at a guard or a provider that throws a Response', async () => {
    expect((await put('/api/apps/ab', {})).status).toBe(403)
  })

  it('resolves each provider once per request, shared with middleware', async () => {
    calls.length = 0
    await put('/api/apps/ab')
    expect(calls).toEqual(['session'])
  })

  it('only resolves what the route injects', async () => {
    calls.length = 0
    await call('/api/apps')
    expect(calls).toEqual([])
  })

  it('swaps providers with override', async () => {
    const test = Router({ override: [Route.override(user, () => ({ id: 'fake' }))], routes: [Update] })
    const res = await test.fetch(
      new Request('http://localhost/apps/ab', { method: 'PUT', body: '{"id":"x"}', headers: { 'content-type': 'application/json' } }),
    )
    expect(await res.json()).toEqual({ id: 'ab', by: 'fake' })
  })

  it('injects on a standalone route too', async () => {
    expect(await (await List.fetch(new Request('http://localhost/apps'))).json()).toEqual({ apps: [{ id: 'a' }] })
  })

  it('takes outside context from `context`', async () => {
    const r = Router({ routes: [Stars], context: () => ({ db: { stars: 3 } }) })
    expect(await (await r.fetch(new Request('http://localhost/stars'))).json()).toEqual({ stars: 3 })
  })

  it('types', () => {
    expectTypeOf(List).toMatchTypeOf<Route.Route<any, {}, any>>()
    // context needed outside inject blocks `fetch` until a router provides it
    expectTypeOf(Router({ routes: [Stars] }).fetch).not.toBeFunction()
    expectTypeOf(Router({ routes: [Stars], context: () => ({ db: { stars: 1 } }) }).fetch).toBeFunction()
    // @ts-expect-error the context is missing `db`
    Router({ routes: [Stars], context: () => ({}) })
  })
})
