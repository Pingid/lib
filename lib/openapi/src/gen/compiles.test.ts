import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import type * as oas from 'openapi-typescript'

import * as Ast from './ast.ts'
import { Emit, bind } from './emit.ts'
import { Media, Route } from './model.ts'
import { print } from './print.ts'
import { read } from './read.ts'

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
      noUnusedLocals: true,
      noUnusedParameters: true,
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
    '/api/things/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        summary: 'Get a thing',
        description: 'One thing, by id.',
        deprecated: true,
        responses: {
          200: {
            description: 'The thing',
            headers: {
              ETag: { description: 'Version tag', required: true, schema: { type: 'string' } },
              'Content-Type': { schema: { type: 'string' } },
            },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Thing' } },
              'text/plain': { schema: { type: 'string' } },
            },
          },
          304: { description: 'Not modified' },
        },
      },
      put: {
        requestBody: {
          required: true,
          content: {
            'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
            'application/json': { schema: { $ref: '#/components/schemas/Thing' } },
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
            },
          },
        },
        responses: { 204: { description: 'Replaced' } },
      },
    },
    '/api/things/{id}/raw': {
      get: {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Bytes', content: { 'image/png': {} } } },
      },
    },
    '/api/login': {
      post: {
        requestBody: {
          content: {
            'application/x-www-form-urlencoded': {
              schema: { type: 'object', required: ['user'], properties: { user: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'ok' } },
      },
    },
    '/api/ticks': {
      get: {
        responses: {
          200: {
            description: 'Ticks',
            content: {
              'text/event-stream': { schema: { $ref: '#/components/schemas/Thing' } },
              'application/json': { schema: { $ref: '#/components/schemas/Thing' } },
              'text/plain': { schema: { $ref: '#/components/schemas/Thing' } },
            },
          },
        },
      },
    },
    '/api/avatar': {
      post: {
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } },
            },
          },
        },
        responses: { 200: { description: 'ok' } },
      },
    },
  },
  components: { schemas: { Thing: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } } },
} as unknown as oas.OpenAPI3

const api = () => read(doc, { silent: true })

/** The text of one builder, from its key up to the start of the next. */
const builder = (out: string, key: string): string => {
  const from = out.indexOf(`"${key}": (_p`, out.indexOf('export const requests'))
  const next = out.indexOf('\n    "', from + 1)

  return out.slice(from, next === -1 ? undefined : next)
}

describe('requests', () => {
  const emit = (bound: Parameters<typeof Emit.requests>[0]) => [...Emit.file(bound), ...Emit.requests(bound)]

  it('emits a builder per route, taking its input and returning a request', async () => {
    const out = print(await api(), { emit })

    expect(out).toContain('export const requests = {')
    expect(out).toContain(
      '"POST /api/docker/containers/{id}/{action}": (_p: Routes["POST /api/docker/containers/{id}/{action}"]["request"])',
    )
    expect(out).toContain('url: `/api/docker/containers/${_p.params.id}/${_p.params.action}${search(_p.query)}`')
    expect(out).toContain('"Content-Type": "application/json"')
    expect(out).toContain('body: JSON.stringify(_p.body)')
  })

  it('defaults the argument away where the route requires nothing of it', async () => {
    const out = print(await api(), { emit })

    expect(out).toContain('"GET /api/health": (_p: Routes["GET /api/health"]["request"] = {}) => ({')
    expect(builder(out, 'GET /api/health')).not.toContain('body')
  })

  it('keeps the argument required where the route requires something', async () => {
    const out = print(await api(), { emit })

    expect(out).toContain('"POST /api/upload": (_p: Routes["POST /api/upload"]["request"]) => ({')
  })

  it('hands a non-JSON body on as it came', async () => {
    const upload = builder(print(await api(), { emit }), 'POST /api/upload')

    expect(upload).toContain('"Content-Type": "text/plain"')
    expect(upload).toContain('body: _p.body')
    expect(upload).not.toContain('JSON.stringify')
  })

  it('reads a path parameter that is not a legal identifier by index', async () => {
    expect(print(await api(), { emit })).toContain('url: `/api/weird-${_p.params["a.b"]}${search(_p.query)}`')
  })

  it('serialises the query and spreads the headers on routes that declare neither, since both stay open', async () => {
    const health = builder(print(await api(), { emit }), 'GET /api/health')

    expect(health).toContain('url: `/api/health${search(_p.query)}`')
    expect(health).toContain('..._p.headers')
  })

  it('puts the query through a helper, emitted once and only when something needs it', async () => {
    const out = print(await api(), { emit })

    expect(out).toContain('url: `/api/things${search(_p.query)}`')
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

describe('content types', () => {
  const emit = (bound: Parameters<typeof Emit.requests>[0]) => [...Emit.file(bound), ...Emit.requests(bound)]
  const route = async (id: string) => (await api()).routes.find((r) => r.id === id)!

  it('tells content types apart by how they travel', () => {
    expect(Media.json('application/json')).toBe(true)
    expect(Media.json('application/problem+json; charset=utf-8')).toBe(true)
    expect(Media.json('application/jsonl')).toBe(false)
    expect(Media.form('application/x-www-form-urlencoded')).toBe(true)
    expect(Media.multipart('multipart/form-data')).toBe(true)
    expect(Media.stream('text/event-stream')).toBe(true)
    expect(Media.binary('application/octet-stream')).toBe(true)
    expect(Media.binary('image/png')).toBe(true)
    expect(Media.binary('application/xml')).toBe(false)
    expect(Media.binary('text/plain')).toBe(false)
  })

  it('reads the summary, description and deprecation off an operation', async () => {
    const get = await route('get /api/things/{id}')

    expect(get).toMatchObject({ summary: 'Get a thing', docs: 'One thing, by id.', deprecated: true })
    expect(print(await api())).toContain('* Get a thing\n     * @deprecated\n     * @description One thing, by id.')
  })

  it('carries path-level parameters onto every operation under the path', async () => {
    expect(Route.params(await route('put /api/things/{id}'), 'path').map((p) => p.name)).toEqual(['id'])
  })

  it('reads response headers onto every variant of the status, leaving Content-Type to the content map', async () => {
    const replies = (await route('get /api/things/{id}')).replies.filter((r) => r.status === '200')

    expect(replies.map((r) => r.media)).toEqual(['application/json', 'text/plain'])
    for (const reply of replies) expect(reply.headers.map((h) => [h.name, h.required])).toEqual([['ETag', true]])
  })

  it('lays each response out by content type, with its headers', async () => {
    const out = print(await api())

    expect(out).toMatch(
      /200: \{\s+content: \{\s+"application\/json": Thing;\s+"text\/plain": string;\s+\};\s+headers: \{\s+\/\*\* @description Version tag \*\/\s+ETag: string;/,
    )
    expect(out).toMatch(/304: \{\s+content: \{\};\s+headers: \{\};/)
  })

  it('types bytes as Blob, whether marked binary or given no schema', async () => {
    const out = print(await api())

    expect(out).toContain('"image/png": Blob;')
    expect(out).toContain('body: Blob;')
    expect(out).toContain('image?: Blob;')
  })

  it('leaves bytes as openapi-typescript types them when told to', async () => {
    const out = print(await read(doc, { silent: true, binary: false }))

    expect(out).not.toContain('Blob')
  })

  it('keys a route taking several bodies on contentType, the JSON one by default', async () => {
    const out = print(await api())
    const put = out.slice(out.indexOf('"PUT /api/things/{id}"'))

    expect(put).toMatch(/\} & \(\{\s+body: Blob;\s+contentType: "application\/octet-stream";/)
    expect(put).toMatch(/\{\s+body: Thing;\s+contentType\?: "application\/json";/)
    expect(put).toMatch(/contentType: "multipart\/form-data";/)
  })

  it('names the one body a route takes, and takes neither field on a route that takes none', async () => {
    const out = print(await api())

    expect(out.slice(out.indexOf('"POST /api/login"'))).toContain('contentType?: "application/x-www-form-urlencoded";')
    expect(out.slice(out.indexOf('"GET /api/health"'))).toContain('contentType?: never;')
  })

  it('encodes a form body as URLSearchParams and multipart as FormData, leaving multipart its own Content-Type', async () => {
    const out = print(await api(), { emit })
    const login = builder(out, 'POST /api/login')
    const avatar = builder(out, 'POST /api/avatar')

    expect(login).toContain('"Content-Type": "application/x-www-form-urlencoded"')
    expect(login).toContain('body: urlEncoded(_p.body)')
    expect(avatar).not.toContain('Content-Type')
    expect(avatar).toContain('body: formData(_p.body)')
  })

  it('picks the encoding at runtime on a route taking several bodies', async () => {
    const put = builder(print(await api(), { emit }), 'PUT /api/things/{id}')

    expect(put).toContain('...send(_p.contentType ?? "application/json", _p.body, _p.headers)')
  })

  it('emits each encoder once, and none a replacement builder would leave unused', async () => {
    const out = print(await api(), { emit })

    for (const helper of ['urlEncoded', 'formData', 'send'])
      expect(out.match(new RegExp(`const ${helper} = `, 'g'))).toHaveLength(1)

    const replaced = print(await api(), { emit: (b) => Emit.requests(b, { request: (r) => Ast.str(r.url) }) })

    expect(replaced).not.toMatch(/const (search|urlEncoded|formData|send) = /)
  })

  it('checks a body against the content type it is sent as', async () => {
    const out = print(await api(), { emit })
    const use = (call: string) => check(`${out}\nexport const r = requests["PUT /api/things/{id}"](${call})`)

    expect(use(`{ params: { id: "1" }, body: { id: "1" } }`)).toEqual([])
    expect(use(`{ params: { id: "1" }, body: new Blob([]), contentType: "application/octet-stream" }`)).toEqual([])
    expect(use(`{ params: { id: "1" }, body: new Blob([]) }`)).not.toEqual([])
  })

  it('builds requests fetch accepts', async () => {
    const out = print(await api(), { emit })
    const calls = [
      'requests["PUT /api/things/{id}"]({ params: { id: "1" }, body: { id: "1" } })',
      'requests["POST /api/login"]()',
    ]

    expect(check(`${out}\n${calls.map((c, i) => `export const r${i} = fetch("http://x", ${c})`).join('\n')}`)).toEqual(
      [],
    )
  })

  it('encodes each body the way it says', async () => {
    const out = print(await api(), { emit })
    const js = ts.transpileModule(out, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
    }).outputText
    const { requests } = await import(`data:text/javascript,${encodeURIComponent(js)}`)

    const login = requests['POST /api/login']({ body: { user: 'a b' }, query: { next: '/x' } })
    expect(login.url).toBe('/api/login?next=%2Fx')
    expect(String(login.body)).toBe('user=a+b')

    const file = new Blob(['hi'])
    const avatar = requests['POST /api/avatar']({ body: { image: file } })
    expect(avatar.body).toBeInstanceOf(FormData)
    expect(avatar.headers).toEqual({})

    const bytes = requests['PUT /api/things/{id}']({
      params: { id: '1' },
      body: file,
      contentType: 'application/octet-stream',
    })
    expect(bytes).toMatchObject({
      url: '/api/things/1',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    })

    const json = requests['PUT /api/things/{id}']({ params: { id: '1' }, body: { id: '1' }, headers: { 'X-A': 'b' } })
    expect(json).toMatchObject({ headers: { 'Content-Type': 'application/json', 'X-A': 'b' }, body: '{"id":"1"}' })

    const multi = requests['PUT /api/things/{id}']({
      params: { id: '1' },
      body: { file },
      contentType: 'multipart/form-data',
    })
    expect(multi.headers).toEqual({})
    expect(multi.body).toBeInstanceOf(FormData)
  })
})

describe('event streams', () => {
  const doc_ = (schemas: Record<string, unknown>, content: Record<string, unknown>) =>
    ({
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      paths: { '/s': { get: { responses: { 200: { description: 'ok', content } } } } },
      components: { schemas },
    }) as unknown as oas.OpenAPI3

  it('wraps a stream body as one event of it, in both the body and the content map', async () => {
    const out = print(await api())
    const ticks = out.slice(out.indexOf('"GET /api/ticks"'))

    expect(ticks).toContain('200: ServerSentEvent<Thing> | Thing;')
    expect(ticks).toContain('"text/event-stream": ServerSentEvent<Thing>;')
    expect(ticks).toContain('"application/json": Thing;')
  })

  it('declares the event type once, with the fields a stream carries', async () => {
    const out = print(await api())

    expect(out.match(/export type ServerSentEvent<T> = \{/g)).toHaveLength(1)
    expect(out).toMatch(/data: T;[\s\S]*event\?: string;[\s\S]*id\?: string;[\s\S]*retry\?: number;/)
  })

  it('declares nothing when no route streams', async () => {
    const out = print(await read(doc_({}, { 'application/json': { schema: { type: 'string' } } }), { silent: true }))

    expect(out).not.toContain('ServerSentEvent')
  })

  it('steps aside for a schema that already has the name', async () => {
    const schemas = { ServerSentEvent: { type: 'string' } }
    const content = { 'text/event-stream': { schema: { $ref: '#/components/schemas/ServerSentEvent' } } }
    const out = print(await read(doc_(schemas, content), { silent: true }))

    expect(out).toContain('export type ServerSentEvent = string;')
    expect(out).toContain('"text/event-stream": ServerSentEvent_2<ServerSentEvent>;')
    expect(check(out)).toEqual([])
  })

  it('takes another name, or leaves the data type bare', async () => {
    const content = { 'text/event-stream; charset=utf-8': { schema: { type: 'number' } } }
    const renamed = print(await read(doc_({}, content), { silent: true }), { events: 'Event' })
    const bare = print(await read(doc_({}, content), { silent: true }), { events: false })

    expect(renamed).toContain('export type Event<T> = {')
    expect(renamed).toContain('200: Event<number>;')
    expect(bare).not.toContain('ServerSentEvent')
    expect(bare).toContain('200: number;')
  })

  it('drops a reply type that repeats within a status', async () => {
    const content = { 'application/json': { schema: { type: 'number' } }, 'text/plain': { schema: { type: 'number' } } }

    expect(print(await read(doc_({}, content), { silent: true }))).toContain('200: number;')
  })
})
