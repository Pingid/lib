import { expect, expectTypeOf, test } from 'vitest'

import { Ship } from '../src/index.ts'

test('a compose file resolves in canonical group order', async () => {
  const data = Ship.Volume('data', () => ({}))
  const db = Ship.Service('db', () => ({ image: 'postgres:16', volumes: [`${data.name}:/var/lib/postgresql/data`] }))

  expect(await Ship.Resolve(Ship.Compose('app', [data, db]), {})).toStrictEqual({
    name: 'app',
    services: { db: { image: 'postgres:16', volumes: ['data:/var/lib/postgresql/data'] } },
    volumes: { data: {} },
  })
})

test('a definition gets the context and its own key, sync or async', async () => {
  const api = Ship.Service('api', async (cx: { tag: string }, name) => ({ image: `${name}:${cx.tag}` }))
  const web = Ship.Service('web', (cx: { registry: string }, name) => ({ image: `${cx.registry}/${name}` }))

  const spec = await Ship.Resolve(Ship.Compose('app', [api, web]), { tag: '1.2', registry: 'ghcr.io' })
  expect(spec.services).toStrictEqual({ api: { image: 'api:1.2' }, web: { image: 'ghcr.io/web' } })
})

test('a failing definition names where it failed', async () => {
  const api = Ship.Service('api', () => {
    throw new Error('no tag')
  })
  await expect(Ship.Resolve(Ship.Compose('app', [api]), {})).rejects.toThrow('app: service.api: no tag')
})

test('the same resource listed twice is one entry; two resources on one key is an error', () => {
  const web = Ship.Network('web', () => ({}))
  expect(Ship.Compose('a', [web, web]).items).toStrictEqual([web])
  expect(() => Ship.Compose('b', [web, Ship.Network('web', () => ({}))])).toThrow(
    'b: two different resources are both network.web',
  )
})

test('an included compose file contributes its resources and its context', async () => {
  const pg = Ship.Compose('pg', [
    Ship.Service('db', (cx: { pg: string }) => ({ image: `postgres:${cx.pg}` })),
    Ship.Volume('data', () => ({})),
  ])
  const app = Ship.Compose('app', [
    pg,
    Ship.Service('api', () => ({ image: 'api', depends_on: [pg.services.db.name] })),
  ])

  const spec = await Ship.Resolve(app, { pg: '16' })
  expect(spec.services).toStrictEqual({ db: { image: 'postgres:16' }, api: { image: 'api', depends_on: ['db'] } })
  expect(Object.keys(spec.volumes!)).toStrictEqual(['data'])
})

test('types: a compose file needs the intersection of its items’ contexts', () => {
  const S1 = Ship.Service('s1', (cx: { image: string }) => ({ image: cx.image, command: ['sleep', 'infinity'] }))
  const S2 = Ship.Service('s2', (cx: { foo: string }) => ({ image: cx.foo, command: ['sleep', 'infinity'] }))
  const S3 = Ship.Service('s3', (_cx, name) => ({ image: name, command: ['sleep', 'infinity'] }))
  const S = Ship.Compose('s', [S1, S2, S3])

  expectTypeOf(S3).toEqualTypeOf<Ship.Service<'s3', { image: 's3'; command: string[] }, {}>>()
  expectTypeOf(Ship.Resolve<{ image: string; foo: string }>).toBeCallableWith(S, { image: 'a', foo: 'b' })
  // @ts-expect-error — `foo` is missing
  Ship.Resolve(S, { image: 'a' })

  // Nested compose files carry their context along.
  const outer = Ship.Compose('outer', [S, Ship.Service('o', (cx: { bar: number }) => ({ image: `${cx.bar}` }))])
  expectTypeOf(Ship.Resolve<{ image: string; foo: string; bar: number }>).toBeCallableWith(outer, {
    image: 'a',
    foo: 'b',
    bar: 1,
  })
  // @ts-expect-error — `bar` is missing
  Ship.Resolve(outer, { image: 'a', foo: 'b' })
})

test('types: groups are keyed by resource name', () => {
  const api = Ship.Service('api', () => ({ image: 'api' }))
  const app = Ship.Compose('app', [
    api,
    Ship.Network('edge', () => ({})),
    Ship.Compose('pg', [Ship.Volume('data', () => ({}))]),
  ])

  expectTypeOf(app.name).toEqualTypeOf<'app'>()
  expectTypeOf(app.services.api).toEqualTypeOf<typeof api>()
  expectTypeOf(app.networks.edge.name).toEqualTypeOf<'edge'>()
  expectTypeOf(app.volumes.data.name).toEqualTypeOf<'data'>()
  expectTypeOf(app.secrets).toEqualTypeOf<{}>()

  // Any resource is still a `Resource`, whatever context it needs.
  expectTypeOf(Ship.Service('x', (_: { a: 1 }) => ({}))).toExtend<Ship.Resource>()

  // @ts-expect-error — no such service
  app.services.db
})
