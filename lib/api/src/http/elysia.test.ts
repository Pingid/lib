import { treaty } from '@elysiajs/eden'
import { Type } from '@sinclair/typebox'
import { Elysia as ElysiaApp } from 'elysia'
import { expect, expectTypeOf, test } from 'vitest'

import { Api } from '../core/index.ts'
import { elysia } from './elysia.ts'
import { route } from './route.ts'

const getRepo = Api.method({
  name: 'get',
  in: Type.Object({
    org: Type.String(),
    repo: Type.String(),
    page: Type.Optional(Type.Integer()),
  }),
  out: Type.Object({ org: Type.String(), repo: Type.String(), stars: Type.Integer() }),
  handle: async (input, context: { db: { stars: number } }) => ({
    org: input.org,
    repo: input.repo,
    stars: context.db.stars + (input.page ?? 0),
  }),
})

const get = route(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['page'] })

const app = new ElysiaApp().decorate('db', { stars: 10 }).get(...elysia(get.with({ db: { stars: 10 } })))

// Elysia extracts the path with a fast scan that assumes a dotted host, so a single-label
// authority like `http://x/` never matches a route. Every request here uses `localhost`.

test('the route serves through elysia with params and query decoded', async () => {
  const response = await app.handle(new Request('http://localhost/orgs/acme/repos/lib?page=5'))

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ org: 'acme', repo: 'lib', stars: 15 })
})

test('elysia validates the parts it was handed and rejects a bad one', async () => {
  const response = await app.handle(new Request('http://localhost/orgs/acme/repos/lib?page=notanumber'))
  expect(response.status).toBe(422)
})

test('eden treaty infers the request and response types through the adapter', () => {
  const call = treaty<typeof app>('localhost').orgs({ org: 'a' }).repos({ repo: 'b' }).get

  type Query = NonNullable<NonNullable<Parameters<typeof call>[0]>['query']>
  expectTypeOf<Query>().toEqualTypeOf<{ page?: number | undefined }>()

  type Data = Awaited<ReturnType<typeof call>>['data']
  expectTypeOf<Data>().toEqualTypeOf<{ org: string; repo: string; stars: number } | null>()
})

test('a route needing context the app does not decorate is a compile error', () => {
  const needy = route(getRepo, { method: 'GET', path: '/n/:org/:repo', rest: 'query' }).needs<{ tenant: string }>()

  // @ts-expect-error the app has no `tenant`
  new ElysiaApp().get(...elysia(needy))

  new ElysiaApp().decorate('tenant', 'acme').get(...elysia(needy))
})
