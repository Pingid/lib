import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import type * as oas from 'openapi-typescript'

import { Emit, bind } from './emit.ts'
import { print } from './print.ts'
import { read } from './read.ts'
import * as Ast from './ast.ts'

/** Runs the generated source through the compiler, reporting only what it says about that file. */
const check = (source: string): string[] => {
  const name = 'generated.ts'
  const host = ts.createCompilerHost({})
  const original = host.getSourceFile.bind(host)

  host.getSourceFile = (file, ...rest) =>
    file === name ? ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true) : original(file, ...rest)
  host.fileExists = (file) => file === name || ts.sys.fileExists(file)
  host.readFile = (file) => (file === name ? source : ts.sys.readFile(file))

  const program = ts.createProgram(
    [name],
    {
      strict: true,
      noEmit: true,
      types: [],
      target: ts.ScriptTarget.ESNext,
      lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
    },
    host,
  )

  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName === name)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '))
}

const doc = {
  openapi: '3.1.0',
  info: { title: 't', version: '1' },
  paths: {
    '/api/docker/containers/{id}/{action}': {
      post: {
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'action',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['start', 'stop', 'restart', 'pause', 'unpause'] },
          },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing' } } },
        },
        responses: { 204: { description: 'ok' } },
      },
    },
    '/api/things': {
      get: {
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'tags', in: 'query', schema: { type: 'array', items: { type: 'string' } } },
          { name: 'X-Trace', in: 'header', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'ok' } },
      },
    },
    '/api/weird-{a.b}': {
      get: {
        parameters: [{ name: 'a.b', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'ok' } },
      },
    },
    '/api/upload': {
      post: {
        requestBody: { required: true, content: { 'text/plain': { schema: { type: 'string' } } } },
        responses: { 200: { description: 'ok' } },
      },
    },
    '/api/health': { get: { responses: { 200: { description: 'ok' } } } },
  },
  components: { schemas: { Thing: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } } },
} as unknown as oas.OpenAPI3

const api = () => read(doc, { silent: true })

/** The text of one builder, from its key up to the start of the next. */
const builder = (out: string, key: string): string => {
  const from = out.indexOf(`"${key}": (p`, out.indexOf('export const requests'))
  const next = out.indexOf('\n    "', from + 1)

  return out.slice(from, next === -1 ? undefined : next)
}

describe('requests', () => {
  const emit = (bound: Parameters<typeof Emit.requests>[0]) => [...Emit.file(bound), ...Emit.requests(bound)]

  it('emits a builder per route, taking its input and returning a request', async () => {
    const out = print(await api(), { emit })

    expect(out).toContain('export const requests = {')
    expect(out).toContain(
      '"POST /api/docker/containers/{id}/{action}": (p: Routes["POST /api/docker/containers/{id}/{action}"]["request"])',
    )
    expect(out).toContain('url: `/api/docker/containers/${p.params.id}/${p.params.action}`')
    expect(out).toContain('"Content-Type": "application/json"')
    expect(out).toContain('body: JSON.stringify(p.body)')
  })

  it('defaults the argument away where the route requires nothing of it', async () => {
    const out = print(await api(), { emit })

    expect(out).toContain('"GET /api/health": (p: Routes["GET /api/health"]["request"] = {}) => ({')
    expect(builder(out, 'GET /api/health')).not.toContain('body')
  })

  it('keeps the argument required where the route requires something', async () => {
    const out = print(await api(), { emit })

    expect(out).toContain('"POST /api/upload": (p: Routes["POST /api/upload"]["request"]) => ({')
  })

  it('hands a non-JSON body on as it came', async () => {
    const upload = builder(print(await api(), { emit }), 'POST /api/upload')

    expect(upload).toContain('"Content-Type": "text/plain"')
    expect(upload).toContain('body: p.body')
    expect(upload).not.toContain('JSON.stringify')
  })

  it('reads a path parameter that is not a legal identifier by index', async () => {
    expect(print(await api(), { emit })).toContain('url: `/api/weird-${p.params["a.b"]}`')
  })

  it('puts the query through a helper, emitted once and only when something needs it', async () => {
    const out = print(await api(), { emit })

    expect(out).toContain('url: `/api/things${search(p.query)}`')
    expect(out.match(/const search = /g)).toHaveLength(1)
  })

  it('leaves the query out of the url when told to', async () => {
    const out = print(await api(), { emit: (b) => Emit.requests(b, { search: false }) })

    expect(out).toContain('url: "/api/things"')
    expect(out).not.toContain('const search')
  })

  it('names the const, and takes a replacement builder', async () => {
    const out = print(await api(), {
      emit: (b) => Emit.requests(b, { name: 'calls', request: (route) => Ast.str(route.url) }),
    })

    expect(out).toContain('export const calls = {')
    expect(out).toContain('"GET /api/health": "/api/health"')
  })

  it('puts the builders under the same keys as the types, suffixes and all', async () => {
    const bound = bind(await api())
    const types = Ast.print([Emit.routes(bound)])
    const values = Ast.print(Emit.requests(bound))

    for (const route of bound.routes) expect(values).toContain(`"${route.method.toUpperCase()} ${route.url}"`)
    for (const route of bound.routes) expect(types).toContain(`"${route.method.toUpperCase()} ${route.url}"`)
  })

  it('emits a file the compiler accepts', async () => {
    expect(check(print(await api(), { emit }))).toEqual([])
  })
})
