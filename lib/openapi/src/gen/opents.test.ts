import { describe, expect, it } from 'vitest'
import type * as oas from 'openapi-typescript'
import ts from 'typescript'

import * as Ast from './ast.ts'
import { Emit } from './emit.ts'
import { Decl, Is, Name, Route } from './model.ts'
import { Op } from './ops.ts'
import { print } from './print.ts'
import { read } from './read.ts'

const doc = {
  openapi: '3.1.0',
  info: { title: 'test', version: '1' },
  paths: {
    '/api/things': {
      get: {
        tags: ['things'],
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing' } } },
          },
        },
      },
      post: {
        tags: ['things'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Thing' } },
            'text/plain': { schema: { type: 'string' } },
          },
        },
        responses: { 201: { description: 'made' }, 400: { description: 'nope' } },
      },
    },
    '/api/things/{id}': {
      get: {
        tags: ['things'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing.Detail' } } },
          },
          404: { description: 'gone' },
        },
      },
    },
    '/internal/health': { get: { tags: ['ops'], responses: { 200: { description: 'ok' } } } },
  },
  components: {
    schemas: {
      'Thing.Detail': {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' }, nested: { $ref: '#/components/schemas/Nested' } },
      },
      Thing: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      Nested: { type: 'object', properties: { at: { type: 'string' } } },
      Unused: { type: 'string' },
    },
  },
} as unknown as oas.OpenAPI3

const api = () => read(doc, { silent: true })
const api_ = api

const generate = async (...ops: Parameters<typeof Op.pipe>) => print(Op.pipe(...ops)(await api()))

describe('read', () => {
  it('flattens paths and methods into standalone routes', async () => {
    const { routes } = await api()

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      'get /api/things',
      'post /api/things',
      'get /api/things/{id}',
      'get /internal/health',
    ])
  })

  it('splits parameters by location and bodies by content type', async () => {
    const { routes } = await api()
    const [list, create] = routes

    expect(list?.params.map((p) => `${p.in}/${p.name}`)).toEqual(['query/limit'])
    expect(create?.bodies.map((b) => b.media)).toEqual(['application/json', 'text/plain'])
    expect(create?.replies.map((r) => r.status)).toEqual(['201', '400'])
  })
})

describe('Route', () => {
  it('reads parameters without walking the source unions', async () => {
    const { routes } = await api()
    const byId = routes.find((r) => r.url === '/api/things/{id}')

    expect(Route.params(byId!, 'path').map((p) => p.name)).toEqual(['id'])
    expect(Route.param(byId!, 'id')?.required).toBe(true)
    expect(Route.param(byId!, 'nope')).toBeUndefined()
  })

  it('picks the first success and the first JSON body by default', async () => {
    const { routes } = await api()
    const create = routes.find((r) => r.method === 'post')

    expect(Route.reply(create!)?.status).toBe('201')
    expect(Route.reply(create!, '400')?.status).toBe('400')
    expect(Route.body(create!)?.media).toBe('application/json')
    expect(Route.body(create!, 'text/plain')?.media).toBe('text/plain')
  })

  it('hands back resolved schemas, never a $ref', async () => {
    const { routes } = await api()
    const list = routes.find((r) => r.url === '/api/things')
    const schema = Route.reply(list!)?.schema

    expect(Is.ref(schema)).toBe(false)
    expect(Is.object(schema) && Object.keys(schema.properties ?? {})).toEqual(['id'])
  })

  it('defaults the emitted name to the url and follows it when the url moves', async () => {
    const { routes } = await api()
    const [list] = routes

    expect(Route.name(list!)).toBe('GET /api/things')
    expect(Route.name({ ...list!, url: '/things' })).toBe('GET /things')
    expect(Route.name({ ...list!, name: 'pinned' })).toBe('pinned')
  })
})

describe('print', () => {
  it('emits named schemas as aliases and routes as one interface', async () => {
    const out = await generate()

    expect(out).toContain('export type ThingDetail = {')
    expect(out).toContain('export interface Routes {')
    expect(out).toContain('"GET /api/things": {')
    expect(out).toContain('method: "GET"')
    expect(out).toContain('url: "/api/things"')
  })

  it('resolves references to the alias, not to the source document shape', async () => {
    const out = await generate()

    expect(out).toContain('200: Thing;')
    expect(out).not.toContain('components[')
  })

  it('gives every route the same fields, whether or not it uses them', async () => {
    const out = await generate()
    const health = out.slice(out.indexOf('"GET /internal/health"'))

    expect(health).toContain('body?: never;')
    expect(health).toContain('params?: never;')
    expect(health).toContain('query?: Record<string, string>;')
    expect(health).toContain('headers?: Record<string, string>;')
  })

  it('nests the input under request and the replies under response', async () => {
    const out = await generate()

    expect(out).toContain('request: {')
    expect(out).toContain('response: {')
    expect(out).not.toContain('replies: {')
  })

  it('takes a replacement shape for the route type', async () => {
    const out = print(await api(), { root: 'Api', route: (r) => Ast.literal(`${r.method} ${r.url}`) })

    expect(out).toContain('export interface Api {')
    expect(out).toContain('"GET /api/things": "get /api/things"')
  })
})

describe('ops', () => {
  it('filters routes in and out', async () => {
    expect(await generate(Op.keep(/^\/api\//))).not.toContain('/internal/health')
    expect(await generate(Op.drop(/^\/internal\//))).not.toContain('/internal/health')
    expect(await generate(Op.keep((r) => r.method === 'post'))).not.toContain('"GET /api/things"')
  })

  it('scopes inner ops to the routes that match, in place', async () => {
    const out = await generate(
      Op.where(
        /^\/api\//,
        Op.url((u) => u.replace(/^\/api/, '')),
      ),
    )

    expect(out).toContain('"GET /things": {')
    expect(out).toContain('"GET /internal/health": {')
    expect(out.indexOf('"GET /things"')).toBeLessThan(out.indexOf('"GET /internal/health"'))
  })

  it('nests routes under groups', async () => {
    const out = await generate(Op.group(Op.byTag), Op.rename(Name.camel), Op.sort)

    expect(out).toContain('things: {')
    expect(out).toContain('getApiThingsId: {')
    expect(out).toContain('ops: {')
  })

  it('suffixes names that collide rather than dropping a route', async () => {
    const out = await generate(Op.rename(() => 'call'))

    expect(out).toContain('call: {')
    expect(out).toContain('call_2: {')
    expect(out).toContain('call_4: {')
  })

  it('renames schemas and carries references along', async () => {
    const out = await generate(Op.schemas((d) => `Api${d.name}`))

    expect(out).toContain('export type ApiThing = {')
    expect(out).toContain('200: ApiThing;')
  })

  it('drops schemas nothing reaches, keeping those reached through another schema', async () => {
    const out = await generate(Op.compact)

    expect(out).toContain('export type ThingDetail = {')
    expect(out).toContain('export type Nested = {')
    expect(out).not.toContain('export type Unused')
  })

  it('lets go of a schema once the last route reaching it is dropped', async () => {
    const out = await generate(Op.drop(/\{id\}/), Op.compact)

    expect(out).toContain('export type Thing = {')
    expect(out).not.toContain('export type Nested')
  })

  it('rewrites parameters one at a time', async () => {
    const out = await generate(Op.params((p) => (p.in === 'query' ? { ...p, name: `_${p.name}` } : null)))

    expect(out).toContain('_limit?: number;')
    expect(out).not.toContain('path: {')
  })

  it('accepts a plain string wherever it accepts a pattern', async () => {
    expect(await generate(Op.keep('/api/things'))).not.toContain('/internal/health')
    expect(await generate(Op.status('404'))).not.toContain('200:')
    expect(await generate(Op.media('text/plain'))).toContain('body: string;')
  })

  it('narrows responses by status and bodies by content type', async () => {
    expect(await generate(Op.status(/^2/))).not.toContain('404:')
    expect(await generate(Op.media(/json/))).not.toContain('body?: Thing | string')
    expect(await generate(Op.media(/json/))).toContain('body: Thing;')
  })
})

describe('declarations', () => {
  /** The schema map: every named schema keyed by the name the document gave it. */
  const schemaMap = Op.declare((api) => ({
    id: '#/emit/Schemas',
    name: 'Schemas',
    kind: 'interface' as const,
    type: Ast.obj(Decl.schemas(api).map((d) => ({ name: d.origin.name, type: Decl.ref(d) }))),
  }))

  it('builds new types out of the model, keyed by schema id', async () => {
    const out = await generate(schemaMap)

    expect(out).toContain('export interface Schemas {')
    expect(out).toContain('"Thing.Detail": ThingDetail;')
    expect(out).toContain('Thing: Thing;')
  })

  it('carries a renamed schema through into anything referencing it', async () => {
    const out = await generate(
      schemaMap,
      Op.schemas((d) => `Api${d.name}`),
    )

    expect(out).toContain('"Thing.Detail": ApiThingDetail;')
    expect(out).not.toContain(': ThingDetail;')
  })

  it('replaces a declaration sharing an id rather than emitting a second', async () => {
    const out = await generate(schemaMap, schemaMap)

    expect(out.match(/interface Schemas/g)).toHaveLength(1)
  })

  it('keeps what an op declared, and the schemas that reach through it', async () => {
    const out = await generate(
      Op.drop(() => true),
      schemaMap,
      Op.compact,
    )

    expect(out).toContain('export interface Schemas {')
    expect(out).toContain('export type Unused = string;')
  })

  it('pulls apart names that collide, pointing references at the right one', async () => {
    const api = await read(
      {
        openapi: '3.1.0',
        info: { title: 'test', version: '1' },
        paths: {},
        components: { schemas: { 'Thing.Detail': { type: 'string' }, ThingDetail: { type: 'number' } } },
      } as unknown as oas.OpenAPI3,
      { silent: true },
    )

    const out = print(schemaMap(api))

    expect(out).toContain('export type ThingDetail = string;')
    expect(out).toContain('export type ThingDetail_2 = number;')
    expect(out).toContain('"Thing.Detail": ThingDetail;')
    expect(out).toContain('ThingDetail: ThingDetail_2;')
  })
})

describe('extract', () => {
  const responses = (guard: boolean) =>
    Op.extract((type, at) =>
      at.in === 'reply' && at.reply.status.startsWith('2') && !(guard && Ast.pointerOf(type))
        ? `${Name.pascal(Route.name(at.route))}Response`
        : null,
    )

  it('hoists route types into their own declarations and refers back to them', async () => {
    const out = await generate(Op.media(/json/), responses(false))

    expect(out).toContain('export type GetApiThingsResponse = Thing;')
    expect(out).toContain('200: GetApiThingsResponse;')
  })

  it('leaves the sites the callback passes on alone', async () => {
    const out = await generate(Op.media(/json/), responses(false))

    expect(out).toContain('body: Thing;')
    expect(out).not.toContain('404: GetApiThingsIdResponse')
  })

  it('leaves a type that is already a reference where it is, when asked to', async () => {
    const out = await generate(Op.media(/json/), responses(true))

    expect(out).toContain('200: Thing;')
    expect(out).not.toContain('GetApiThingsResponse')
    expect(out).toContain('export type PostApiThingsResponse = never;')
  })

  it('records where each declaration came from', async () => {
    const made = Decl.made(responses(false)(await api()))

    expect(made.map((d) => d.name)).toContain('GetApiThingsResponse')
    expect(made.every((d) => d.origin?.kind === 'made' && d.origin.at?.in === 'reply')).toBe(true)
  })
})

describe('emit', () => {
  it('takes a replacement layout, with the default parts on hand', async () => {
    const out = print(await api(), {
      emit: (bound) => [
        ...Emit.decls(bound),
        Emit.routes(bound, { root: 'Api', route: (r) => Ast.literal(r.url) }),
        Ast.alias('Urls', Ast.union([...new Set(bound.routes.map((r) => r.url))].map(Ast.literal))),
      ],
    })

    expect(out).toContain('export interface Api {')
    expect(out).toContain('"GET /api/things": "/api/things"')
    expect(out).toContain('export type Urls = "/api/things" | "/api/things/{id}" | "/internal/health";')
  })

  it('hands the emitter a model with every reference already bound', async () => {
    const out = print(await api(), { emit: (bound) => Emit.decls(bound), banner: '' })

    expect(out).toContain('export type ThingDetail = {')
    expect(out).not.toContain('#/components/schemas')
    expect(out).not.toContain('Routes')
  })
})

describe('collapse', () => {
  const type = (source: string): ts.TypeNode => {
    const file = ts.createSourceFile('t.ts', `type T = ${source}`, ts.ScriptTarget.Latest, false)
    const [statement] = file.statements

    return (statement as ts.TypeAliasDeclaration).type
  }

  const show = (node: ts.TypeNode) => Ast.print([node]).replace(/\s+/g, ' ').trim()

  it('drops the union members that already appear', () => {
    const out = Ast.collapse(
      type('{ message: string } | { message: string } | { message?: string } | { message?: string }'),
    )

    expect(show(out)).toBe('{ message: string; } | { message?: string; }')
  })

  it('matches shapes whatever order their members are written in', () => {
    expect(show(Ast.collapse(type('{ a: string; b: number } | { b: number; a: string }')))).toBe(
      '{ a: string; b: number; }',
    )
    expect(Ast.same(type('string | number'), type('number | string'))).toBe(true)
  })

  it('unwraps a union left holding one member', () => {
    expect(show(Ast.collapse(type('{ a: string } | { a: string }')))).toBe('{ a: string; }')
  })

  it('reaches unions nested inside other types', () => {
    expect(show(Ast.collapse(type('{ at: { a: 1 } | { a: 1 } }')))).toBe('{ at: { a: 1; }; }')
    expect(show(Ast.collapse(type('({ a: 1 } | { a: 1 })[]')))).toBe('{ a: 1; }[]')
  })

  it('leaves members that only look alike', () => {
    expect(show(Ast.collapse(type('{ a: string } | { a: number }')))).toBe('{ a: string; } | { a: number; }')
    expect(show(Ast.collapse(type('{ a: string } | { a?: string }')))).toBe('{ a: string; } | { a?: string; }')
  })

  it('folds a member another member admits, when asked to', () => {
    const subsume = { subsume: true }

    expect(show(Ast.collapse(type('{ a: string } | { a?: string }'), subsume))).toBe('{ a?: string; }')
    expect(show(Ast.collapse(type('{ a: string; b: number } | { a: string }'), subsume))).toBe('{ a: string; }')
    expect(show(Ast.collapse(type('"a" | string'), subsume))).toBe('string')
    expect(show(Ast.collapse(type('{ a: 1 } | unknown'), subsume))).toBe('unknown')
  })

  it('leaves an intersection whose members constrain different properties', () => {
    const out = Ast.collapse(
      type('({ status: "403" } & { message?: string }) | ({ status: "404" } & { message?: string })'),
      {
        subsume: true,
      },
    )

    expect(show(out)).toBe(
      '({ status: "403"; } & { message?: string; }) | ({ status: "404"; } & { message?: string; })',
    )
  })

  it('drops the member that adds nothing: never from a union, unknown from an intersection', () => {
    expect(show(Ast.collapse(type('never | { a: 1 }')))).toBe('{ a: 1; }')
    expect(show(Ast.collapse(type('never | { a: 1 } | { b: 2 }')))).toBe('{ a: 1; } | { b: 2; }')
    expect(show(Ast.collapse(type('unknown & { a: 1 }')))).toBe('{ a: 1; }')
    expect(show(Ast.collapse(type('never | never')))).toBe('never')
  })

  it('drops the rest around a member that swallows them: unknown in a union, never in an intersection', () => {
    expect(show(Ast.collapse(type('{ a: 1 } & never')))).toBe('never')
    expect(show(Ast.collapse(type('({ status: "400" } & never) | { status: "401" }')))).toBe('{ status: "401"; }')
    expect(show(Ast.collapse(type('{ a: 1 } | unknown')))).toBe('unknown')
  })

  it('keeps members neither side admits, and never empties a union', () => {
    const subsume = { subsume: true }

    expect(show(Ast.collapse(type('{ a: string } | { b: string }'), subsume))).toBe('{ a: string; } | { b: string; }')
    expect(show(Ast.collapse(type('string | number'), subsume))).toBe('string | number')
  })

  it('collapses intersections the other way round', () => {
    expect(show(Ast.collapse(type('{ a: 1 } & { a: 1 }')))).toBe('{ a: 1; }')
    expect(show(Ast.collapse(type('{ a: string } & { a: string; b: number }'), { subsume: true }))).toBe(
      '{ a: string; b: number; }',
    )
  })

  it('runs over the model as an op', async () => {
    const out = await generate(
      Op.declare((api) => ({
        id: '#/emit/Failures',
        name: 'Failures',
        kind: 'interface' as const,
        type: Ast.obj(
          api.routes.map((route) => ({
            name: Route.name(route),
            type: Ast.union(route.replies.map(() => Ast.obj([{ name: 'message', type: type('string') }]))),
          })),
        ),
      })),
      Op.collapse(),
    )

    expect(out).toContain('"POST /api/things": {\n        message: string;\n    };')
  })
})

describe('references', () => {
  it('finds what an extract lifted out of a route, without being told the id', async () => {
    const lifted = Op.extract((_type, at) => (at.in === 'reply' ? `${Name.pascal(Route.name(at.route))}Reply` : null))
    const api = lifted(await api_())
    const list = api.routes.find((r) => r.url === '/api/things' && r.method === 'get')!

    const ok = Decl.of(api, list, (at) => at.in === 'reply' && at.reply.status === '200')

    expect(ok.map((d) => d.name)).toEqual(['GetApiThingsReply'])
    expect(Decl.of(api, list).length).toBe(1)
  })

  it('points a built declaration at a lifted one, through the rename', async () => {
    const out = await generate(
      Op.extract((_type, at) =>
        at.in === 'reply' && at.reply.status === '200' ? Name.pascal(Route.name(at.route)) : null,
      ),
      Op.declare((api) => ({
        id: '#/emit/Responses',
        name: 'Responses',
        kind: 'interface' as const,
        type: Ast.obj(
          api.routes.map((route) => ({
            name: Name.pascal(Route.name(route)),
            type: Ast.union(Decl.of(api, route, (at) => at.in === 'reply' && at.reply.status === '200').map(Decl.ref)),
          })),
        ),
      })),
      Op.schemas((d) => `Api${d.name}`),
    )

    expect(out).toContain('GetApiThings: GetApiThings;')
    expect(out).not.toContain(': unknown;')
  })

  it('tells two lifted declarations apart where their names collide', async () => {
    const twins = {
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      paths: {
        '/api/things': {
          get: {
            responses: {
              200: {
                description: 'a',
                content: { 'application/json': { schema: { type: 'object', properties: { a: { type: 'string' } } } } },
              },
            },
          },
        },
        '/api/Things': {
          get: {
            responses: {
              200: {
                description: 'b',
                content: { 'application/json': { schema: { type: 'object', properties: { b: { type: 'number' } } } } },
              },
            },
          },
        },
      },
    } as unknown as oas.OpenAPI3

    const api = Op.extract((_t, at) => (at.in === 'reply' ? Name.pascal(Route.name(at.route)) : null))(
      await read(twins, { silent: true }),
    )

    const out = print(
      Op.declare((a) => ({
        id: '#/emit/Map',
        name: 'Map',
        kind: 'interface' as const,
        type: Ast.obj(a.routes.map((r) => ({ name: r.url, type: Ast.union(Decl.of(a, r).map(Decl.ref)) }))),
      }))(api),
    )

    // Both routes pascal-case to GetApiThings, so the second declaration takes a suffix.
    expect(out).toContain('"/api/things": GetApiThings;')
    expect(out).toContain('"/api/Things": GetApiThings_2;')
  })

  it('reports a pointer with nothing behind it rather than quietly emitting unknown', async () => {
    const warnings: string[] = []
    const warn = console.warn

    console.warn = (message: string) => void warnings.push(message)

    try {
      print(Op.declare(() => ({ id: '#/emit/Broken', name: 'Broken', type: Decl.ref('#/gone') }))(await api_()))
    } finally {
      console.warn = warn
    }

    expect(warnings.join('\n')).toContain('#/gone')
  })

  it('stays quiet when told to', async () => {
    const warnings: string[] = []
    const warn = console.warn

    console.warn = (message: string) => void warnings.push(message)

    try {
      print(Op.declare(() => ({ id: '#/emit/Broken', name: 'B', type: Decl.ref('#/gone') }))(await api_()), {
        silent: true,
      })
    } finally {
      console.warn = warn
    }

    expect(warnings).toEqual([])
  })
})
