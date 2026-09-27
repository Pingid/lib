import { Hono as App } from 'hono'
import { hc } from 'hono/client'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createItem, getFile, getItem, getStars, uploadFile } from './fixtures.ts'
import * as Hono from './hono.ts'

const app = new App()
  .use(async (c, next) => (c.set('db' as never, { stars: 7 } as never), next()))
  .on(...Hono.honoRoute(getItem))
  .on(...Hono.honoRoute(createItem))
  .on(...Hono.honoRoute(getStars))

const post = (body: unknown) =>
  app.request('/items', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

describe('hono adapter', () => {
  it('serves params and coerced query', async () => {
    const res = await app.request('/items/abc?bonus=5')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'abc', name: 'box', stars: 15 })
  })

  it('replies with the declared status', async () => {
    expect((await app.request('/items/missing')).status).toBe(404)
  })

  it('reads the json body', async () => {
    const res = await post({ name: 'crate' })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ name: 'crate' })
  })

  it('rejects invalid input with 422', async () => {
    const res = await app.request('/items/abc?bonus=nope')
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ error: 'validation', issues: [{ path: 'bonus' }] })
    expect((await post({})).status).toBe(422)
  })

  it('takes route context from c.var by default', async () => {
    expect(await (await app.request('/stars')).json()).toEqual({ stars: 7 })
  })

  it('builds context with a custom function', async () => {
    const custom = new App().on(...Hono.honoRoute(getStars, () => ({ db: { stars: 3 } })))
    expect(await (await custom.request('/stars')).json()).toEqual({ stars: 3 })
  })

  it('infers hc request and response types', () => {
    const client = hc<typeof app>('http://localhost')
    const get = client.items[':id'].$get
    type Args = NonNullable<Parameters<typeof get>[0]>
    expectTypeOf<Args['param']>().toEqualTypeOf<{ id: string }>()
    expectTypeOf<Args['query']>().toEqualTypeOf<{ bonus?: number }>()

    type Res = Awaited<ReturnType<typeof get>>
    expectTypeOf<Awaited<ReturnType<Extract<Res, { status: 200 }>['json']>>>().toEqualTypeOf<{
      id: string
      name: string
      stars: number
    }>()
    expectTypeOf<Awaited<ReturnType<Extract<Res, { status: 404 }>['json']>>>().toEqualTypeOf<{ error: string }>()

    type Body = NonNullable<Parameters<typeof client.items.$post>[0]>['json']
    expectTypeOf<Body>().toEqualTypeOf<{ name: string }>()
  })
})

describe('honoRoutes', () => {
  const routes = [getItem, createItem, getStars] as const
  const chained = new App()
    .on(...Hono.honoRoute(getItem))
    .on(...Hono.honoRoute(createItem))
    .on(...Hono.honoRoute(getStars))
  const nested = new App()
    .use(async (c, next) => (c.set('db' as never, { stars: 7 } as never), next()))
    .route('/api', Hono.honoRoutes(routes))

  type SchemaOf<T> = T extends App<any, infer S, any> ? S : never

  it('serves a group mounted under a prefix', async () => {
    expect(await (await nested.request('/api/items/abc?bonus=1')).json()).toMatchObject({ stars: 11 })
    expect(await (await nested.request('/api/stars')).json()).toEqual({ stars: 7 })
  })

  it('registers onto a given app, keeping its base path', async () => {
    const v1 = Hono.honoRoutes([getStars], new App().basePath('/v1'), () => ({ db: { stars: 2 } }))
    expect(await (await v1.request('/v1/stars')).json()).toEqual({ stars: 2 })
    expectTypeOf<keyof SchemaOf<typeof v1>>().toEqualTypeOf<'/v1/stars'>()
  })

  it('types the group exactly as chained app.on calls', () => {
    expectTypeOf<SchemaOf<ReturnType<typeof Hono.honoRoutes<typeof routes>>>>().toEqualTypeOf<
      SchemaOf<typeof chained>
    >()
  })

  it('infers hc types through the nested app', () => {
    const get = hc<typeof nested>('http://localhost').api.items[':id'].$get
    expectTypeOf<NonNullable<Parameters<typeof get>[0]>['query']>().toEqualTypeOf<{ bonus?: number }>()
    type Res = Awaited<ReturnType<typeof get>>
    expectTypeOf<Awaited<ReturnType<Extract<Res, { status: 404 }>['json']>>>().toEqualTypeOf<{ error: string }>()
  })
})

describe('hono binary responses', () => {
  const files = new App().on(...Hono.honoRoute(getFile))

  it('serves bytes as application/octet-stream', async () => {
    const res = await files.request('/files/a1')
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([1, 2, 3])
  })

  it('types the binary status apart from the json one for hc', () => {
    type Res = Awaited<ReturnType<ReturnType<typeof hc<typeof files>>['files'][':id']['$get']>>
    expectTypeOf<Extract<Res, { status: 200 }>['arrayBuffer']>().returns.resolves.toEqualTypeOf<ArrayBuffer>()
    expectTypeOf<Awaited<ReturnType<Extract<Res, { status: 404 }>['json']>>>().toEqualTypeOf<{ error: string }>()
  })
})

describe('hono binary request bodies', () => {
  it('hands the uploaded bytes to the route', async () => {
    const app = new App().on(...Hono.honoRoute(uploadFile))
    const res = await app.request('/files', {
      method: 'POST',
      body: new Uint8Array([1, 2, 3, 4]),
      headers: { 'content-type': 'application/octet-stream' },
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ size: 4 })
  })
})
