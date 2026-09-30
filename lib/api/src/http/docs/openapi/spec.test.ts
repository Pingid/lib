import { Type } from '@sinclair/typebox'
import { BASIC } from '@hyperjump/json-schema/experimental'
import { validate } from '@hyperjump/json-schema/openapi-3-2'
import { z } from 'zod'
import { describe, expect, it } from 'vitest'

import * as Route from '../../route/index.ts'
import { resolve, type OpenApiConfig } from './index.ts'

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------
const Item = Type.Object({ id: Type.String(), name: Type.String(), tags: Type.Optional(Type.Array(Type.String())) })
const Node = Type.Recursive((This) => Type.Object({ id: Type.String(), children: Type.Array(This) }), { $id: 'node' })
const User = z.object({ name: z.string(), email: z.email(), nick: z.string().nullable() }).meta({ id: 'User' })
const Tree: any = z.object({
  id: z.string(),
  get kids() {
    return z.array(Tree)
  },
})

const routes: Route.RouteSpec[] = [
  Route.Spec('/items/:id', {
    method: 'GET',
    params: Type.Object({ id: Type.String({ description: 'Item id' }) }),
    query: Type.Object({ verbose: Type.Optional(Type.Boolean()), filter: Type.Optional(Type.Array(Type.String())) }),
    response: {
      200: { 'application/json': Item },
      404: { 'application/json': Type.Object({ error: Type.String() }, { description: 'Missing' }) },
      500: { 'text/plain': Type.String() },
    },
  }),
  { path: '/items', method: 'POST', body: Type.Object({ name: Type.String() }), response: Item },
  { path: '/items/:id', method: 'DELETE', response: { 204: {} } },
  { path: '/items/:id/raw', method: 'PUT', body: { 'application/json': Item, 'application/octet-stream': {} } },
  { path: '/files/:id', response: { 200: { 'application/octet-stream': { description: 'The file' } } } },
  { path: '/extra/:a', params: Type.Object({ a: Type.String(), b: Type.String() }) },
  { path: '/a-b', response: Type.String() },
  { path: '/aB', response: Type.String() },
  { path: '/users', response: z.object({ users: z.array(User), tree: Tree }) },
  { path: '/users', method: 'POST', body: User, response: { 201: { 'application/json': User } } },
  { path: '/users/search', query: z.object({ owner: User.optional(), page: z.coerce.number().optional() }) },
  { path: '/tree', response: Tree },
  { path: '/nodes', response: Type.Object({ root: Node }) },
  { path: '/events', response: { 200: { 'text/event-stream': Type.Object({ data: Type.String() }) } } },
  { path: '/html', response: { 200: { 'text/html': {} }, default: { 'application/json': Item } } as any },
  { path: '/ztypes', response: z.object({ t: z.tuple([z.string()]), at: z.iso.datetime(), n: z.number().int() }) },
  {
    path: '/types',
    response: Type.Object({
      tuple: Type.Tuple([Type.String(), Type.Number()]),
      date: Type.Date(),
      big: Type.BigInt(),
      bytes: Type.Uint8Array(),
      re: Type.RegExp(/^a$/),
      gone: Type.Optional(Type.Undefined()),
      record: Type.Record(Type.String(), Type.Number()),
    }),
  },
]

const configs: [string, Partial<OpenApiConfig>][] = [
  ['defaults', {}],
  ['models', { models: { Item, User, Tree } }],
  ['refs off', { refs: false, models: { Item, User, Tree } }],
  ['dedupe off', { dedupe: false, models: { Item, User, Tree } }],
]

// ------------------------------------------------------------------
// Checks
// ------------------------------------------------------------------
/** Errors against the official OpenAPI 3.2 schema, which also checks every Schema Object against its dialect. */
const schemaErrors = async (doc: unknown) => {
  const out = await validate('https://spec.openapis.org/oas/3.2/schema-base', doc as any, BASIC)
  if (out.valid) return []
  return (out.errors ?? []).map((e) => `${e.instanceLocation}: ${e.absoluteKeywordLocation}`)
}

/** What the schema cannot express: refs that resolve, unique operation ids, and path parameters that match. */
const ruleErrors = (doc: any) => {
  const errors: string[] = []
  const refs = (json: unknown, at: string): void => {
    if (Array.isArray(json)) return json.forEach((v, i) => refs(v, `${at}/${i}`))
    if (!json || typeof json !== 'object') return
    for (const [k, v] of Object.entries(json)) {
      if (k === '$ref' && !resolves(doc, v)) errors.push(`${at}: unresolved $ref ${v}`)
      refs(v, `${at}/${k}`)
    }
  }
  refs(doc, '#')

  const ids = new Set<string>()
  for (const [path, item] of Object.entries<any>(doc.paths ?? {})) {
    const names = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
    for (const [method, op] of Object.entries<any>(item)) {
      if (ids.has(op.operationId)) errors.push(`${method} ${path}: duplicate operationId ${op.operationId}`)
      ids.add(op.operationId)
      const params = (op.parameters ?? []).filter((p: any) => p.in === 'path').map((p: any) => p.name)
      if (params.sort().join() !== names.sort().join()) errors.push(`${method} ${path}: path parameters ${params}`)
    }
  }
  return errors
}

const resolves = (doc: unknown, ref: unknown) =>
  typeof ref === 'string' &&
  ref.startsWith('#/') &&
  ref
    .slice(2)
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce<any>((at, key) => (at && typeof at === 'object' ? at[key] : undefined), doc) !== undefined

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------
describe('openapi 3.2 conformance', () => {
  it.each(configs)('emits a valid document with %s', async (_, config) => {
    const doc = resolve({ info: { title: 'Conformance', version: '1.0.0' }, routes, ...config })
    expect(await schemaErrors(doc)).toEqual([])
    expect(ruleErrors(doc)).toEqual([])
  })

  it('catches invalid documents', async () => {
    const doc: any = resolve({ routes: [{ path: '/x/:id', response: Type.Object({ a: Type.String() }) }] })
    doc.components.schemas.GetXByIdResponse.properties.a = {
      type: 'Date',
      items: { $ref: '#/components/schemas/Nope' },
    }
    doc.paths['/x/{id}'].get.parameters = []
    doc.paths['/x/{id}'].post = { operationId: 'getXById', responses: { 200: { description: 'OK' } } }
    expect(await schemaErrors(doc)).not.toEqual([])
    expect(ruleErrors(doc)).toEqual([
      '#/components/schemas/GetXByIdResponse/properties/a/items: unresolved $ref #/components/schemas/Nope',
      'get /x/{id}: path parameters ',
      'post /x/{id}: duplicate operationId getXById',
      'post /x/{id}: path parameters ',
    ])
  })
})
