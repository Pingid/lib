import { Type } from '@sinclair/typebox'
import { expect, expectTypeOf, test } from 'vitest'

import { Api } from '../core/index.ts'
import * as Route from './route.ts'

const getRepo = Api.method({
  name: 'get',
  in: Type.Object({
    org: Type.String(),
    repo: Type.String(),
    include: Type.Optional(Type.Array(Type.String())),
    requestId: Type.Optional(Type.String()),
  }),
  out: Type.Object({ id: Type.String() }),
  handle: async () => ({ id: 'x' }),
})

// ---------------- the spec is checked against the input --------------------------

test('a complete spec compiles and resolves every key to a source', () => {
  const r = Route.of(getRepo, {
    method: 'GET',
    path: '/orgs/:org/repos/:repo',
    query: ['include'],
    header: { requestId: 'x-request-id' },
  })

  expect(r.bindings).toEqual({
    org: { source: 'path', name: 'org', array: false },
    repo: { source: 'path', name: 'repo', array: false },
    include: { source: 'query', name: 'include', array: true },
    requestId: { source: 'header', name: 'x-request-id', array: false },
  })
})

test('an unbound key is a compile error naming the key', () => {
  // @ts-expect-error `requestId` is bound to no source, and no `rest` is set
  Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['include'] })
})

test('a key already claimed by an earlier source cannot be claimed again', () => {
  // @ts-expect-error `include` is claimed by both `query` and `header`
  Route.of(getRepo, {
    method: 'GET',
    path: '/orgs/:org/repos/:repo',
    query: ['include'],
    header: ['include', 'requestId'],
  })
})

test('a path parameter the input does not declare is a compile error', () => {
  // @ts-expect-error the input has no `slug`
  Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo/:slug', query: ['include'], header: ['requestId'] })
})

test('rest silences the unbound check and sweeps what is left', () => {
  const r = Route.of(getRepo, { method: 'POST', path: '/orgs/:org/repos/:repo', rest: 'body' })

  expect(r.bindings['include']).toEqual({ source: 'body', name: 'include', array: true })
  expect(r.bindings['requestId']).toEqual({ source: 'body', name: 'requestId', array: false })
})

test('body true is sugar for rest body', () => {
  const r = Route.of(getRepo, { method: 'POST', path: '/orgs/:org/repos/:repo', body: true })
  expect(r.bindings['include']?.source).toBe('body')
})

test('a non-literal path degrades to no check rather than flagging every key', () => {
  const path: string = '/orgs/:org/repos/:repo'
  Route.of(getRepo, { method: 'GET', path })
})

// ---------------- what the route carries --------------------------

test('the path literal survives into the route type', () => {
  const r = Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['include'], header: ['requestId'] })
  expectTypeOf(r).toExtend<Route.Type<any, any, any, '/orgs/:org/repos/:repo'>>()
})

test('an array-typed field is marked so repeated values collect', () => {
  const r = Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['include'], header: ['requestId'] })
  expect(r.bindings['include']?.array).toBe(true)
  expect(r.bindings['org']?.array).toBe(false)
})

test('a header wire name defaults to the kebab-cased key', () => {
  const r = Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['include'], header: ['requestId'] })
  expect(r.bindings['requestId']?.name).toBe('request-id')
})

test('the route matches its own path', () => {
  const r = Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['include'], header: ['requestId'] })
  expect(r.match('/orgs/acme/repos/lib')).toEqual({ org: 'acme', repo: 'lib' })
  expect(r.match('/orgs/acme')).toBeUndefined()
})
