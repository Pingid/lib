import { Type } from '@sinclair/typebox'
import { expect, test } from 'vitest'

import { Api } from '../core/index.ts'
import { router, toFetch } from './fetch.ts'
import { route } from './route.ts'

interface Db {
  tag: string
}

const getRepo = Api.method({
  name: 'get',
  in: Type.Object({
    org: Type.String(),
    repo: Type.String(),
    page: Type.Optional(Type.Integer()),
    tags: Type.Optional(Type.Array(Type.String())),
    requestId: Type.Optional(Type.String()),
  }),
  handle: async (input, context: { db: Db }) => ({ ...input, tag: context.db.tag }),
})

const createRepo = Api.method({
  name: 'create',
  in: Type.Object({ org: Type.String(), name: Type.String(), private: Type.Optional(Type.Boolean()) }),
  handle: async (input) => ({ created: input.name, org: input.org, private: input.private }),
})

const get = route(getRepo, {
  method: 'GET',
  path: '/orgs/:org/repos/:repo',
  query: ['page', 'tags'],
  header: { requestId: 'x-request-id' },
}).with({ db: { tag: 'live' } })

const create = route(createRepo, { method: 'POST', path: '/orgs/:org/repos', body: true })

const handler = router(get, create)
const json = async (response: Response) => [response.status, await response.json()] as const

test('path parameters and query reach the handler as one flat object', async () => {
  const [status, body] = await json(await handler(new Request('http://x/orgs/acme/repos/lib?page=2')))

  expect(status).toBe(200)
  expect(body).toEqual({ org: 'acme', repo: 'lib', page: 2, tag: 'live' })
})

test('a query value is coerced from its schema before validation', async () => {
  const [, body] = await json(await handler(new Request('http://x/orgs/a/repos/b?page=7')))
  expect(body).toMatchObject({ page: 7 })
})

test('a repeated query key collects when the field is an array', async () => {
  const [, body] = await json(await handler(new Request('http://x/orgs/a/repos/b?tags=x&tags=y')))
  expect(body).toMatchObject({ tags: ['x', 'y'] })
})

test('an absent optional key is omitted, not set to undefined', async () => {
  const [, body] = await json(await handler(new Request('http://x/orgs/a/repos/b')))
  expect(Object.keys(body as object)).toEqual(['org', 'repo', 'tag'])
})

test('a header arrives under its renamed wire name', async () => {
  const request = new Request('http://x/orgs/a/repos/b', { headers: { 'x-request-id': 'abc' } })
  const [, body] = await json(await handler(request))
  expect(body).toMatchObject({ requestId: 'abc' })
})

test('a value the schema rejects is a 422 carrying the issue path', async () => {
  const [status, body] = await json(await handler(new Request('http://x/orgs/a/repos/b?page=notanumber')))

  expect(status).toBe(422)
  expect(body).toMatchObject({ error: 'validation' })
  expect((body as { issues: { path: string }[] }).issues[0]?.path).toBe('page')
})

test('a json body is split by key alongside the path parameter', async () => {
  const request = new Request('http://x/orgs/acme/repos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'lib', private: true }),
  })

  expect(await json(await handler(request))).toEqual([200, { created: 'lib', org: 'acme', private: true }])
})

test('a form body is coerced per field, as a query string would be', async () => {
  const form = new URLSearchParams({ name: 'lib', private: 'true' })
  const request = new Request('http://x/orgs/acme/repos', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  })

  expect(await json(await handler(request))).toEqual([200, { created: 'lib', org: 'acme', private: true }])
})

test('an unmatched path and a mismatched method are both 404', async () => {
  expect((await handler(new Request('http://x/nope'))).status).toBe(404)
  expect((await handler(new Request('http://x/orgs/a/repos/b', { method: 'DELETE' }))).status).toBe(404)
})

test('a standalone route handler takes its context as a second argument', async () => {
  const bare = toFetch(route(getRepo, { method: 'GET', path: '/r/:org/:repo', rest: 'query' }))
  const [, body] = await json(await bare(new Request('http://x/r/a/b'), { db: { tag: 'passed-in' } }))

  expect(body).toMatchObject({ tag: 'passed-in' })
})

test('from derives the method context out of the framework context', async () => {
  const derived = toFetch(
    route(getRepo, { method: 'GET', path: '/d/:org/:repo', rest: 'query' }).from((c: { tag: string }) => ({
      db: { tag: c.tag },
    })),
  )

  const [, body] = await json(await derived(new Request('http://x/d/a/b'), { tag: 'derived' }))
  expect(body).toMatchObject({ tag: 'derived' })
})
