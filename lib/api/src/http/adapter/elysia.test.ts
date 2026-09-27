import { treaty } from '@elysiajs/eden'
import { Type } from '@sinclair/typebox'
import { Elysia as App } from 'elysia'
import { z } from 'zod'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as Route from '../route/index.ts'
import * as Elysia from './elysia.ts'
import { createItem, getFile, getItem, getStars, uploadFile } from './fixtures.ts'

const app = new App()
  .decorate('db', { stars: 7 })
  .route(...Elysia.elysiaRoute(getItem))
  .route(...Elysia.elysiaRoute(createItem))
  .route(...Elysia.elysiaRoute(getStars))

// Elysia's path scan assumes a dotted host, so every request uses `localhost`.
const request = (path: string, init?: RequestInit) => app.handle(new Request(`http://localhost${path}`, init))
const post = (body: unknown) =>
  request('/items', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

describe('elysia adapter', () => {
  it('serves params and coerced query', async () => {
    const res = await request('/items/abc?bonus=5')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'abc', name: 'box', stars: 15 })
  })

  it('replies with the declared status', async () => {
    expect((await request('/items/missing')).status).toBe(404)
  })

  it('reads the json body', async () => {
    const res = await post({ name: 'crate' })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ name: 'crate' })
  })

  it('rejects invalid input with the route 422, as other adapters do', async () => {
    const res = await request('/items/abc?bonus=nope')
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ error: 'validation', issues: [{ path: 'bonus' }] })
    expect((await post({})).status).toBe(422)
  })

  it('validates once, so transforms survive', async () => {
    const flag = Route.Route('/flag', {
      query: z.object({ on: z.stringbool() }),
      handle: (c) => c.text(String(c.params.query.on === true)),
    })
    const res = await new App().route(...Elysia.elysiaRoute(flag)).handle(new Request('http://localhost/flag?on=true'))
    expect(await res.text()).toBe('true')
  })

  it('hands elysia documentation-only schemas and the route metadata', () => {
    const [, , , hook] = Elysia.elysiaRoute(
      Route.Route('/items/:id', {
        summary: 'Read an item',
        tags: ['items'],
        params: Type.Object({ id: Type.String() }),
        handle: (c) => c.text(c.params.path.id),
      }),
    ) as unknown as [unknown, unknown, unknown, any]
    expect(hook.params['~standard'].jsonSchema.input({ target: 'draft-07' })).toMatchObject({
      properties: { id: { type: 'string' } },
    })
    expect(hook.params['~standard'].validate('anything')).toEqual({ value: 'anything' })
    expect(hook.detail).toEqual({ summary: 'Read an item', tags: ['items'] })
  })

  it('takes route context from decorators', async () => {
    expect(await (await request('/stars')).json()).toEqual({ stars: 7 })
  })

  it('rejects a route whose context the app does not provide', () => {
    // @ts-expect-error the app does not decorate `db`
    new App().route(...Elysia.elysiaRoute(getStars))
    new App().route(...Elysia.elysiaRoute(getStars, () => ({ db: { stars: 1 } })))
  })

  it('infers eden request and response types', () => {
    const api = treaty<typeof app>('localhost')
    const get = api.items({ id: 'abc' }).get
    type Query = NonNullable<NonNullable<Parameters<typeof get>[0]>['query']>
    expectTypeOf<Query>().toEqualTypeOf<{ bonus?: number }>()

    type Res = Awaited<ReturnType<typeof get>>
    expectTypeOf<Res['data']>().toEqualTypeOf<{ id: string; name: string; stars: number } | null>()
    expectTypeOf<Extract<NonNullable<Res['error']>, { status: 404 }>['value']>().toEqualTypeOf<{ error: string }>()

    type Body = Parameters<typeof api.items.post>[0]
    expectTypeOf<Body>().toEqualTypeOf<{ name: string }>()
  })
})

describe('elysiaRoutes', () => {
  const routes = [getItem, createItem, getStars] as const
  const chained = new App()
    .decorate('db', { stars: 7 })
    .route(...Elysia.elysiaRoute(getItem))
    .route(...Elysia.elysiaRoute(createItem))
    .route(...Elysia.elysiaRoute(getStars))
  const grouped = Elysia.elysiaRoutes(routes, new App().decorate('db', { stars: 7 }))
  const nested = new App()
    .decorate('db', { stars: 7 })
    .group('/api', (api) => Elysia.elysiaRoutes(routes, api))
    .use(Elysia.elysiaRoutes([getStars], new App({ prefix: '/v1' }), () => ({ db: { stars: 2 } })))

  const get = (path: string) => nested.handle(new Request(`http://localhost${path}`)).then((r) => r.json())

  it('serves groups nested by .group and by a prefixed .use', async () => {
    expect(await get('/api/items/abc?bonus=1')).toMatchObject({ stars: 11 })
    expect(await get('/api/stars')).toEqual({ stars: 7 })
    expect(await get('/v1/stars')).toEqual({ stars: 2 })
  })

  it('types the group exactly as chained app.route calls', () => {
    expectTypeOf<(typeof grouped)['~Routes']>().toEqualTypeOf<(typeof chained)['~Routes']>()
  })

  it('rejects routes whose context the app does not provide', () => {
    // @ts-expect-error the app does not decorate `db`
    Elysia.elysiaRoutes([getStars])
    Elysia.elysiaRoutes([getItem])
  })

  it('infers eden types through nested groups', () => {
    const api = treaty<typeof nested>('localhost')
    type Res = Awaited<ReturnType<ReturnType<typeof api.api.items>['get']>>
    expectTypeOf<Res['data']>().toEqualTypeOf<{ id: string; name: string; stars: number } | null>()
    expectTypeOf<Awaited<ReturnType<typeof api.v1.stars.get>>['data']>().toEqualTypeOf<{ stars: number } | null>()
  })
})

describe('elysia binary responses', () => {
  const files = new App().route(...Elysia.elysiaRoute(getFile))

  it('serves bytes as application/octet-stream, which eden reads as an ArrayBuffer', async () => {
    const res = await files.handle(new Request('http://localhost/files/a1'))
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
    const { data } = await treaty(files).files({ id: 'a1' }).get()
    expect(data).toBeInstanceOf(ArrayBuffer)
    expectTypeOf(data).toEqualTypeOf<ArrayBuffer | null>()
  })
})

describe('elysia binary request bodies', () => {
  it('hands the bytes elysia parsed to the route', async () => {
    const app = new App().route(...Elysia.elysiaRoute(uploadFile))
    const res = await app.handle(
      new Request('http://localhost/files', {
        method: 'POST',
        body: new Uint8Array([1, 2, 3, 4]),
        headers: { 'content-type': 'application/octet-stream' },
      }),
    )
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ size: 4 })
  })
})
