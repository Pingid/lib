import type * as oa from 'openapi-typescript'
import { Type } from '@sinclair/typebox'
import { z } from 'zod'
import { describe, expect, it } from 'vitest'

import * as Route from '../../route/index.ts'
import { resolve as document, type OpenApiConfig } from './index.ts'

const Item = Type.Object({ id: Type.String(), name: Type.String() })

const getItem = Route.Spec('/items/:id', {
  method: 'GET',
  params: Type.Object({ id: Type.String({ description: 'Item id' }) }),
  query: Type.Object({ verbose: Type.Optional(Type.Boolean()) }),
  response: {
    200: { 'application/json': Item },
    404: { 'application/json': Type.Object({ error: Type.String() }, { description: 'Missing' }) },
    500: { 'text/plain': Type.String() },
  },
})

const createItem = {
  path: '/items',
  method: 'POST',
  body: Type.Object({ name: Type.String() }),
  response: Item,
} satisfies Route.RouteSpec

const BINARY = { type: 'string', contentMediaType: 'application/octet-stream' }

const build = (config: OpenApiConfig) =>
  document(config) as Omit<oa.OpenAPI3, 'paths'> & { paths: Record<string, Record<string, oa.OperationObject>> }

const doc = (config: Partial<OpenApiConfig> = {}) => build({ routes: [getItem, createItem], ...config })

describe('openapi', () => {
  it('fills document defaults and converts path syntax', () => {
    const d = doc()
    expect(d.openapi).toBe('3.2.0')
    expect(d.info).toEqual({ title: 'API', version: '1.0.0' })
    expect(Object.keys(d.paths!)).toEqual(['/items/{id}', '/items'])
  })

  it('derives operation ids and parameters', () => {
    const op = doc().paths['/items/{id}']!['get']!
    expect(op.operationId).toBe('getItemsById')
    expect(op.parameters).toEqual([
      { name: 'id', in: 'path', required: true, description: 'Item id', schema: expect.any(Object) },
      { name: 'verbose', in: 'query', required: false, schema: { type: 'boolean' } },
    ])
  })

  it('hoists object schemas and dedupes identical ones', () => {
    const d = doc()
    const get = d.paths!['/items/{id}']!['get']!.responses!
    const post = d.paths!['/items']!['post']!
    expect(get[200]).toEqual({
      description: 'OK',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/GetItemsByIdResponse' } } },
    })
    expect((post.responses![200] as any).content['application/json'].schema).toEqual(
      (get[200] as any).content['application/json'].schema,
    )
    expect(get[404]).toMatchObject({ description: 'Missing' })
    expect(get[500]).toEqual({
      description: 'Internal Server Error',
      content: { 'text/plain': { schema: { type: 'string' } } },
    })
    expect(Object.keys(d.components!.schemas!)).toEqual([
      'GetItemsByIdResponse',
      'GetItemsById404Response',
      'PostItemsBody',
    ])
  })

  it('resolves inline schemas to named models, including nested ones', () => {
    const d = doc({ models: { Item, List: Type.Object({ items: Type.Array(Item) }) } })
    const s = d.components!.schemas!
    expect(Object.keys(s)).toEqual(['Item', 'List', 'GetItemsById404Response', 'PostItemsBody'])
    expect(s['List']).toMatchObject({ properties: { items: { items: { $ref: '#/components/schemas/Item' } } } })
  })

  it('references models when dedupe is off', () => {
    const d = build({
      dedupe: false,
      models: { Item },
      routes: [getItem, { path: '/all', response: Type.Array(Item) }],
    })
    const schema = (path: string) => (d.paths[path]!['get']!.responses![200] as any).content['application/json'].schema
    expect(schema('/items/{id}')).toEqual({ $ref: '#/components/schemas/Item' })
    expect(schema('/all')).toEqual({ type: 'array', items: { $ref: '#/components/schemas/Item' } })
    expect(Object.keys(d.components!.schemas!)).not.toContain('GetItemsByIdResponse')
  })

  it('references a model used with its own description, keeping the description beside the $ref', () => {
    const User = z.object({ name: z.string() }).describe('A user')
    const d = build({
      models: { User },
      routes: [{ path: '/me', response: z.object({ owner: User.describe('The owner'), plain: User }) }],
    })
    expect((d.components!.schemas!['GetMeResponse'] as any).properties).toEqual({
      owner: { $ref: '#/components/schemas/User', description: 'The owner' },
      plain: { $ref: '#/components/schemas/User' },
    })
  })

  it('leaves a described primitive inline rather than matching it to a primitive model', () => {
    const d = build({
      models: { Id: Type.String() },
      routes: [{ path: '/p', response: Type.Object({ a: Type.String({ description: 'x' }) }) }],
    })
    expect((d.components!.schemas!['GetPResponse'] as any).properties).toEqual({
      a: { type: 'string', description: 'x' },
    })
  })

  it('unwraps a zod model carrying a meta id, under the model name', () => {
    const M = z.object({ id: z.string() }).meta({ id: 'Other' })
    const d = build({
      models: { Thing: M },
      routes: [
        { path: '/t', response: z.object({ t: M }) },
        { path: '/t2', response: M },
      ],
    })
    const s = d.components!.schemas!
    expect(s['Thing']).toEqual({ type: 'object', properties: { id: { type: 'string' } }, required: ['id'] })
    expect(s['Other']).toBeUndefined()
    expect((s['GetTResponse'] as any).properties).toEqual({ t: { $ref: '#/components/schemas/Thing' } })
    expect((d.paths['/t2']!['get']!.responses![200] as any).content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/Thing',
    })
  })

  it('hoists a zod meta id used without a model, without pointing it at itself', () => {
    const M = z.object({ id: z.string() }).meta({ id: 'M' })
    const s = build({ routes: [{ path: '/m', response: z.object({ m: M, n: M }) }] }).components!.schemas!
    expect(s['M']).toEqual({ type: 'object', properties: { id: { type: 'string' } }, required: ['id'] })
    expect((s['GetMResponse'] as any).properties).toEqual({
      m: { $ref: '#/components/schemas/M' },
      n: { $ref: '#/components/schemas/M' },
    })
  })

  it('hoists schemas named by $id or title', () => {
    const User = Type.Object({ name: Type.String() }, { $id: 'User' })
    const d = build({ routes: [{ path: '/me', response: Type.Object({ user: User }) }] })
    expect(d.components!.schemas!['User']).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    })
  })

  it('supports zod schemas', () => {
    const User = z.object({ name: z.string() })
    const d = build({ routes: [{ path: '/users', response: User }], models: { User } })
    expect(d.paths!['/users']!['get']!.responses![200]).toMatchObject({
      content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
    })
  })

  it('inlines everything when refs is off', () => {
    const d = doc({ refs: false })
    expect(d.components).toBeUndefined()
    expect(d.paths!['/items']!['post']!.requestBody).toMatchObject({
      content: { 'application/json': { schema: { type: 'object' } } },
    })
  })

  it('keeps duplicates apart when dedupe is off', () => {
    expect(Object.keys(doc({ dedupe: false }).components!.schemas!)).toContain('PostItemsResponse')
  })

  it('keeps operation ids unique', () => {
    const d = build({ routes: [{ path: '/a-b' }, { path: '/aB' }, { path: '/x', operationId: 'getAB' }] })
    expect(
      [d.paths['/a-b']!['get']!, d.paths['/aB']!['get']!, d.paths['/x']!['get']!].map((o) => o.operationId),
    ).toEqual(['getAB', 'getAB2', 'getAB3'])
  })

  it('leaves out path parameters the path does not name', () => {
    const d = build({ routes: [{ path: '/a/:id', params: Type.Object({ id: Type.String(), other: Type.String() }) }] })
    expect(d.paths['/a/{id}']!['get']!.parameters).toEqual([
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ])
  })

  it('hoists definitions a parameter schema refers to', () => {
    const M = z.object({ id: z.string() }).meta({ id: 'M' })
    const d = build({ routes: [{ path: '/q', query: z.object({ m: M.optional() }) }] })
    expect(d.paths['/q']!['get']!.parameters).toEqual([
      { name: 'm', in: 'query', required: false, schema: { $ref: '#/components/schemas/M' } },
    ])
    expect(d.components!.schemas!['M']).toMatchObject({ type: 'object' })
  })

  it('names default responses in pascal case', () => {
    const d = build({ routes: [{ path: '/d', response: { default: { 'application/json': Item } } as any }] })
    expect(Object.keys(d.components!.schemas!)).toEqual(['GetDDefaultResponse'])
  })

  it('accepts naming, operation id and document overrides', () => {
    const d = doc({
      info: { title: 'Items', version: '2.0.0' },
      operationId: (s) => `${s.method}:${s.path}`,
      name: ({ operationId, role }) => `${role}_${operationId.length}`,
    })
    expect(d.info.title).toBe('Items')
    expect(d.paths!['/items']!['post']!.operationId).toBe('POST:/items')
    expect(Object.keys(d.components!.schemas!)).toContain('body_11')
  })
})

describe('openapi binary responses', () => {
  it('documents application/octet-stream as a string of that media type', () => {
    const d = build({
      routes: [{ path: '/files/:id', response: { 200: { 'application/octet-stream': { description: 'The file' } } } }],
    })
    expect(d.paths['/files/{id}']!['get']!.responses![200]).toEqual({
      description: 'The file',
      content: { 'application/octet-stream': { schema: BINARY } },
    })
  })
})

describe('openapi binary request bodies', () => {
  it('documents each media type a body accepts', () => {
    const d = build({
      routes: [
        {
          path: '/files',
          method: 'POST',
          body: { 'application/json': Type.Object({ url: Type.String() }), 'application/octet-stream': {} },
        },
      ],
    })
    expect(d.paths['/files']!['post']!.requestBody).toEqual({
      required: true,
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/PostFilesBody' } },
        'application/octet-stream': { schema: BINARY },
      },
    })
  })
})

describe('openapi event streams', () => {
  it('describes each event with itemSchema, its data holding the JSON streamed', () => {
    const d = build({ routes: [{ path: '/events', response: { 200: { 'text/event-stream': Item } } }] })
    expect((d.paths['/events']!['get']!.responses![200] as any).content).toEqual({
      'text/event-stream': {
        itemSchema: {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'string',
              contentMediaType: 'application/json',
              contentSchema: { $ref: '#/components/schemas/GetEventsEventStreamResponse' },
            },
          },
        },
      },
    })
  })
})

describe('openapi recursive schemas', () => {
  const Tree: any = z.object({
    id: z.string(),
    get kids() {
      return z.array(Tree)
    },
  })

  it('points a recursive model and its nested uses at one component', () => {
    const d = build({ models: { Tree }, routes: [{ path: '/t', response: z.object({ tree: Tree }) }] })
    const s = d.components!.schemas!
    expect(Object.keys(s)).toEqual(['Tree', 'GetTResponse'])
    expect((s['Tree'] as any).properties.kids.items).toEqual({ $ref: '#/components/schemas/Tree' })
    expect((s['GetTResponse'] as any).properties.tree).toEqual({ $ref: '#/components/schemas/Tree' })
  })

  it('hoists a recursive schema so its root refs have a component, even when refs is off', () => {
    const d = build({ refs: false, routes: [{ path: '/t', response: Tree }] })
    expect((d.paths['/t']!['get']!.responses![200] as any).content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/GetTResponse',
    })
    expect((d.components!.schemas!['GetTResponse'] as any).properties.kids.items).toEqual({
      $ref: '#/components/schemas/GetTResponse',
    })
  })

  it('hoists a TypeBox recursive schema when refs is off', () => {
    const Node = Type.Recursive((This) => Type.Object({ next: Type.Optional(This) }), { $id: 'node' })
    const d = build({ refs: false, routes: [{ path: '/n', response: Type.Object({ head: Node }) }] })
    const schema = (d.paths['/n']!['get']!.responses![200] as any).content['application/json'].schema
    expect(schema.properties.head).toEqual({ $ref: '#/components/schemas/Node' })
    expect(d.components!.schemas!['Node']).toEqual({
      type: 'object',
      properties: { next: { $ref: '#/components/schemas/Node' } },
    })
  })
})

describe('openapi schema dialect', () => {
  it('writes tuples with prefixItems', () => {
    const d = build({
      refs: false,
      routes: [{ path: '/t', response: Type.Object({ a: Type.Tuple([Type.String()]) }) }],
    })
    const { a } = (d.paths['/t']!['get']!.responses![200] as any).content['application/json'].schema.properties
    expect(a).toEqual({ type: 'array', prefixItems: [{ type: 'string' }], items: false, minItems: 1, maxItems: 1 })
  })

  it('writes open additionalProperties as true', () => {
    const d = build({
      refs: false,
      routes: [{ path: '/m', response: z.object({ map: z.record(z.string(), z.unknown()) }) }],
    })
    const { map } = (d.paths['/m']!['get']!.responses![200] as any).content['application/json'].schema.properties
    expect(map).toEqual({ type: 'object', propertyNames: { type: 'string' }, additionalProperties: true })
  })

  it('writes TypeBox JavaScript types as the JSON they serialise to', () => {
    const response = Type.Object({
      date: Type.Date({ description: 'When' }),
      big: Type.BigInt(),
      bytes: Type.Uint8Array(),
      re: Type.RegExp(/^a+$/),
      gone: Type.Optional(Type.Undefined()),
      fn: Type.Function([], Type.String()),
    })
    const d = build({ refs: false, routes: [{ path: '/j', response }] })
    expect((d.paths['/j']!['get']!.responses![200] as any).content['application/json'].schema.properties).toEqual({
      date: { type: 'string', format: 'date-time', description: 'When' },
      big: { type: 'integer' },
      bytes: BINARY,
      re: { type: 'string', pattern: '^a+$' },
      gone: { not: {} },
      fn: {},
    })
  })
})
