import { Type } from '@sinclair/typebox'
import { Hono as HonoApp } from 'hono'
import { hc } from 'hono/client'
import { expect, expectTypeOf, test } from 'vitest'

import { Api } from '../core/index.ts'
import { hono } from './hono.ts'
import { route } from './route.ts'

const getRepo = Api.method({
  name: 'get',
  in: Type.Object({ org: Type.String(), repo: Type.String(), page: Type.Optional(Type.Integer()) }),
  out: Type.Object({ org: Type.String(), repo: Type.String(), stars: Type.Integer() }),
  handle: async (input, context: { db: { stars: number } }) => ({
    org: input.org,
    repo: input.repo,
    stars: context.db.stars + (input.page ?? 0),
  }),
})

const get = route(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['page'] }).with({
  db: { stars: 10 },
})

const app = new HonoApp().get('/orgs/:org/repos/:repo', hono(get))

test('the route serves through hono with params and query decoded', async () => {
  const response = await app.request('http://localhost/orgs/acme/repos/lib?page=5')

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ org: 'acme', repo: 'lib', stars: 15 })
})

test('a value the schema rejects is a 422 carrying the issue path', async () => {
  const response = await app.request('http://localhost/orgs/a/repos/b?page=nope')

  expect(response.status).toBe(422)
  expect(await response.json()).toMatchObject({ error: 'validation', issues: [{ path: 'page' }] })
})

test('hc infers the request and response types through the adapter', () => {
  const call = hc<typeof app>('http://localhost').orgs[':org'].repos[':repo'].$get

  type Query = NonNullable<Parameters<typeof call>[0]>['query']
  expectTypeOf<Query>().toEqualTypeOf<{ page?: number }>()

  type Data = Awaited<ReturnType<Awaited<ReturnType<typeof call>>['json']>>
  expectTypeOf<Data>().toEqualTypeOf<{ org: string; repo: string; stars: number }>()
})

test('from reads the method context off the hono context', async () => {
  const derived = route(getRepo, { method: 'GET', path: '/d/:org/:repo', rest: 'query' }).from(
    (c: { var: { stars: number } }) => ({ db: { stars: c.var.stars } }),
  )

  const app2 = new HonoApp()
    .use('*', async (c, next) => {
      c.set('stars' as never, 99 as never)
      await next()
    })
    .get('/d/:org/:repo', hono(derived))

  const response = await app2.request('http://localhost/d/a/b')
  expect(await response.json()).toMatchObject({ stars: 99 })
})
