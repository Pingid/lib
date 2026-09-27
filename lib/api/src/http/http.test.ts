import { Type } from '@sinclair/typebox'
import { z } from 'zod'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as Http from './index.ts'

const Item = Type.Object({ id: Type.String(), name: Type.String(), count: Type.Integer() })
const NotFound = Type.Object({ error: Type.String() })

const getItem = Http.Spec('/items/:id', {
  method: 'GET',
  params: Type.Object({ id: Type.String() }),
  query: Type.Object({ limit: Type.Optional(Type.Integer()) }),
  response: { 200: { 'application/json': Item }, 404: { 'application/json': NotFound } },
})

const call = (rt: { fetch: (req: Request) => Promise<Response> }, path: string, init?: RequestInit) =>
  rt.fetch(new Request(`http://localhost${path}`, init))

const post = (rt: { fetch: (req: Request) => Promise<Response> }, path: string, body: unknown) =>
  call(rt, path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

describe('Route.Spec', () => {
  it('puts the path on the spec', () => {
    expect(getItem).toMatchObject({ path: '/items/:id', method: 'GET' })
    expectTypeOf(getItem.path).toEqualTypeOf<'/items/:id'>()
  })

  it('accepts a path without parameters', () => {
    expect(Http.Spec('/items', { method: 'POST', body: Item })).toMatchObject({ path: '/items' })
  })

  it('requires a params schema covering every path parameter', () => {
    // @ts-expect-error `id` is missing from params
    Http.Spec('/items/:id', { params: Type.Object({ name: Type.String() }) })
  })
})

describe('Route.Route', () => {
  const route = Http.Route(getItem, (c) =>
    c.params.path.id === 'missing'
      ? c.json({ error: 'not found' }, 404)
      : c.json({ id: c.params.path.id, name: 'item', count: c.params.query.limit ?? 0 }),
  )

  it('validates path params and coerces the query', async () => {
    const res = await call(route, '/items/a1?limit=5')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(await res.json()).toEqual({ id: 'a1', name: 'item', count: 5 })
  })

  it('replies with the status the handler picks', async () => {
    const res = await call(route, '/items/missing')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not found' })
  })

  it('answers invalid input with 422 and the issue paths', async () => {
    const res = await call(route, '/items/a1?limit=many')
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ error: 'validation', issues: [{ path: 'limit' }] })
  })

  it('validates a JSON body', async () => {
    const create = Http.Route(
      { path: '/items', method: 'POST', body: Type.Object({ name: Type.String() }), response: Item },
      (c) => c.json({ id: 'new', name: c.params.body.name, count: 0 }),
    )
    expect(await (await post(create, '/items', { name: 'first' })).json()).toMatchObject({ name: 'first' })
    expect((await post(create, '/items', {})).status).toBe(422)
  })

  it('reads path params as strings when no schema is given', async () => {
    const route = Http.Route({ path: '/items/:id/tags/:tag' }, (c) => c.json(c.params.path as never))
    expect(await (await call(route, '/items/a1/tags/red')).json()).toEqual({ id: 'a1', tag: 'red' })
  })

  it('works with standard schemas such as zod', async () => {
    const route = Http.Route(
      {
        path: '/items/:id',
        method: 'POST',
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string().min(1) }),
        response: z.object({ id: z.string(), name: z.string() }),
      },
      (c) => c.json({ id: c.params.path.id, name: c.params.body.name }),
    )
    expect(await (await post(route, '/items/a1', { name: 'first' })).json()).toEqual({ id: 'a1', name: 'first' })
    expect((await post(route, '/items/a1', { name: '' })).status).toBe(422)
  })

  it('propagates errors that are not responses', async () => {
    const route = Http.Route({ path: '/items' }, () => {
      throw new Error('boom')
    })
    await expect(call(route, '/items')).rejects.toThrow('boom')
  })
})

describe('Route.Route with the handler in the spec', () => {
  const update = Http.Route('/items/:id', {
    method: 'PUT',
    summary: 'Update an item',
    params: Type.Object({ id: Type.String() }),
    body: z.object({ name: z.string() }),
    response: { 200: { 'application/json': Item }, 404: { 'application/json': NotFound } },
    handle: (c) =>
      c.params.path.id === 'missing'
        ? c.json({ error: 'not found' }, 404)
        : c.json({ id: c.params.path.id, name: c.params.body.name, count: 1 }),
  })

  it('serves like the two-argument form', async () => {
    const res = await call(update, '/items/a1', { method: 'PUT', body: JSON.stringify({ name: 'renamed' }) })
    expect(await res.json()).toEqual({ id: 'a1', name: 'renamed', count: 1 })
    expect((await call(update, '/items/missing', { method: 'PUT', body: '{"name":"x"}' })).status).toBe(404)
  })

  it('keeps the spec, minus the handler, on the route', () => {
    expect(update.spec).toMatchObject({ path: '/items/:id', method: 'PUT', summary: 'Update an item' })
    expect(update.spec).not.toHaveProperty('handle')
    expectTypeOf(update.spec.path).toEqualTypeOf<'/items/:id'>()
    expectTypeOf(update.spec.method).toEqualTypeOf<'PUT'>()
  })

  it('infers the handler context from the sibling properties', () => {
    Http.Route('/items/:id', {
      params: Type.Object({ id: Type.String() }),
      query: Type.Object({ limit: Type.Optional(Type.Integer()) }),
      response: Item,
      handle: (c) => {
        expectTypeOf(c.params.path).toEqualTypeOf<{ id: string }>()
        expectTypeOf(c.params.query).toEqualTypeOf<{ limit?: number }>()
        expectTypeOf(c.params.body).toEqualTypeOf<undefined>()
        // @ts-expect-error the response is an Item
        c.json({ error: 'x' })
        return c.json({ id: c.params.path.id, name: 'item', count: 0 })
      },
    })
    Http.Route('/items/:id/tags/:tag', {
      handle: (c) => {
        expectTypeOf(c.params.path).toEqualTypeOf<Record<'id' | 'tag', string>>()
        return c.text('ok')
      },
    })
  })

  it('requires params to cover every path parameter', () => {
    Http.Route('/items/:id', {
      // @ts-expect-error `id` is missing from params
      params: Type.Object({ name: Type.String() }),
      handle: (c) => c.text('ok'),
    })
  })
})

describe('binary request bodies', () => {
  const bytes = (body: BodyInit, type = 'application/octet-stream') => ({
    method: 'POST',
    body,
    headers: { 'content-type': type },
  })

  it('hands an octet-stream body to the handler as an ArrayBuffer', async () => {
    const upload = Http.Route('/files', {
      method: 'POST',
      body: { 'application/octet-stream': {} },
      handle: (c) => {
        expectTypeOf(c.params.body).toEqualTypeOf<ArrayBuffer>()
        return c.json({ size: c.params.body.byteLength } as never)
      },
    })
    expect(await (await call(upload, '/files', bytes(new Uint8Array([1, 2, 3])))).json()).toEqual({ size: 3 })
  })

  it('reads a body that accepts both by its content type', async () => {
    const put = Http.Route('/files/:id', {
      method: 'PUT',
      body: { 'application/json': Type.Object({ url: Type.String() }), 'application/octet-stream': {} },
      handle: (c) => {
        expectTypeOf(c.params.body).toEqualTypeOf<{ url: string } | ArrayBuffer>()
        return c.text(c.params.body instanceof ArrayBuffer ? `bytes:${c.params.body.byteLength}` : c.params.body.url)
      },
    })
    expect(await (await call(put, '/files/a', bytes(new Uint8Array([9, 9])))).text()).toBe('bytes:2')
    expect(await (await call(put, '/files/a', bytes('{"url":"u"}', 'application/json'))).text()).toBe('u')
    expect((await call(put, '/files/a', bytes('{}', 'application/json'))).status).toBe(422)
  })
})

describe('replies', () => {
  const route = Http.Route(
    {
      path: '/items/:id',
      params: Type.Object({ id: Type.String() }),
      response: {
        200: { 'text/plain': {} },
        201: { 'text/event-stream': Type.Object({ n: Type.Number() }) },
        202: { 'text/html': {} },
      },
    },
    (c) => {
      if (c.params.path.id === 'html') return c.html('<p>item</p>', 202)
      if (c.params.path.id === 'text') return c.text('item', { status: 200, headers: { 'x-item': '1' } })
      return c.sse(async function* () {
        yield { n: 1 }
        yield { n: 2 }
      }, 201)
    },
  )

  it('sends text with its content type and extra headers', async () => {
    const res = await call(route, '/items/text')
    expect(res.headers.get('content-type')).toBe('text/plain')
    expect(res.headers.get('x-item')).toBe('1')
    expect(await res.text()).toBe('item')
  })

  it('sends html', async () => {
    const res = await call(route, '/items/html')
    expect(res.status).toBe(202)
    expect(res.headers.get('content-type')).toBe('text/html')
  })

  it('sends binary as application/octet-stream, from bytes or a stream', async () => {
    const download = Http.Route('/items/:id/file', {
      response: { 200: { 'application/octet-stream': { description: 'The file' } } },
      handle: (c) =>
        c.params.path.id === 'stream'
          ? c.binary(new Blob([new Uint8Array([4, 5])]).stream())
          : c.binary(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-disposition': 'attachment' } }),
    })
    const res = await call(download, '/items/a1/file')
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
    expect(res.headers.get('content-disposition')).toBe('attachment')
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([1, 2, 3])
    expect([...new Uint8Array(await (await call(download, '/items/stream/file')).arrayBuffer())]).toEqual([4, 5])
  })

  it('streams server-sent events one JSON payload per event', async () => {
    const res = await call(route, '/items/stream')
    expect(res.status).toBe(201)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    expect(await res.text()).toBe(': connected\n\ndata: {"n":1}\n\ndata: {"n":2}\n\n')
  })
})

describe('Route.adapt', () => {
  const spec = Http.Spec('/me', { response: Type.Object({ user: Type.String() }) })
  const me = Http.Route(spec, (c, cx: { user: string }) => c.json({ user: cx.user }))

  it('infers the context type from the annotated second parameter', () => {
    expectTypeOf(me).toEqualTypeOf<Http.Route<typeof spec, { user: string }, Request>>()
    const inSpec = Http.Route('/me', { handle: (c, cx: { user: string }) => c.text(cx.user) })
    expectTypeOf(inSpec.handler).parameter(1).toEqualTypeOf<{ user: string }>()
    expectTypeOf(Http.Route('/me', { handle: (c) => c.text('ok') }).handler)
      .parameter(1)
      .toEqualTypeOf<{}>()
  })

  it('requires the context the handler declares', () => {
    // @ts-expect-error `user` must be a string
    Http.adapt(me, { context: { user: 1 } })
  })

  it('supplies context as a value or per request', async () => {
    expect(await (await call(Http.adapt(me, { context: { user: 'ada' } }), '/me')).json()).toEqual({ user: 'ada' })
    const perRequest = Http.adapt(me, { context: (req) => ({ user: req.headers.get('x-user')! }) })
    expect(await (await call(perRequest, '/me', { headers: { 'x-user': 'lin' } })).json()).toEqual({ user: 'lin' })
  })

  it('lets an extractor replace how a request part is read', async () => {
    const route = Http.Route(getItem, (c) => c.json({ id: c.params.path.id, name: 'item', count: 0 }))
    const adapted = Http.adapt(route, { path: () => ({ id: 'from-extractor' }) })
    expect(await (await call(adapted, '/anything')).json()).toMatchObject({ id: 'from-extractor' })
  })
})

describe('handler types', () => {
  it('types params from the schemas, and path params from the path otherwise', () => {
    Http.Route(getItem, (c) => {
      expectTypeOf(c.params.path).toEqualTypeOf<{ id: string }>()
      expectTypeOf(c.params.query).toEqualTypeOf<{ limit?: number }>()
      expectTypeOf(c.params.body).toEqualTypeOf<undefined>()
      return c.json({ error: 'x' }, 404)
    })
    Http.Route({ path: '/items/:id/tags/:tag' }, (c) => {
      expectTypeOf(c.params.path).toEqualTypeOf<Record<'id' | 'tag', string>>()
      return c.text('ok')
    })
  })

  it('checks reply data against the status it is sent with', () => {
    Http.Route(getItem, (c) => {
      // @ts-expect-error a 200 carries an Item
      c.json({ error: 'x' })
      // @ts-expect-error 500 is not declared
      c.json({ error: 'x' }, 500)
      return c.json({ error: 'x' }, 404)
    })
  })
})
