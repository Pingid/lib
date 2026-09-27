import ts from 'typescript'

import * as Ast from './ast.ts'
import {
  Media,
  Name,
  Route,
  mapTypes,
  type Api,
  type Body,
  type Decl,
  type Header,
  type In,
  type Param,
  type Reply,
} from './model.ts'

/** How the routes are laid out. Shared by `Emit.routes` and `PrintOptions`. */
export type Shape = {
  /** Interface the routes are emitted into. Defaults to `Routes`. */
  root?: string
  /** The type emitted for one route. Replace it to change the generated shape wholesale. */
  route?: (route: Route) => ts.TypeNode
  /**
   * The generic a `text/event-stream` body is wrapped in, so a stream reads as one when typed:
   * `ServerSentEvent<Tick>` rather than a bare `Tick`. It is declared alongside the routes, under a
   * free name, whenever a route streams. Defaults to `ServerSentEvent`; `false` leaves the data type bare.
   */
  events?: string | false
}

/**
 * The model as statements. Everything here takes a *bound* model — one that has been
 * through `bind`, so every reference is a real name rather than a pointer placeholder.
 * `print` binds for you; reach for these when replacing the file layout via `PrintOptions.emit`:
 *
 * ```ts
 * print(api, { emit: (api) => [...Emit.decls(api), Emit.routes(api, { root: 'Api' }), myOwnNode(api)] })
 * ```
 */
export const Emit = {
  /** Every declaration, as an `export type` or, where it asked for one, an `export interface`. */
  decls: (api: Api): ts.Statement[] => api.decls.map(declare),

  /** The routes, nested by group then name, as one interface. */
  routes: (api: Api, options: Shape = {}): ts.Statement => {
    const shape = { ...options, events: events(api, options) }

    return Ast.iface(options.root ?? 'Routes', tree(api.routes, options.route ?? ((r) => Emit.shape(r, shape))))
  },

  /**
   * The event type a `text/event-stream` body is wrapped in, when a route has one. `Emit.routes`
   * refers to it under the same name, so emit both or neither:
   *
   * ```ts
   * export type ServerSentEvent<T> = { data: T; event?: string; id?: string; retry?: number }
   * ```
   */
  events: (api: Api, options: Shape = {}): ts.Statement[] => {
    const name = events(api, options)

    return name && api.routes.some((route) => route.replies.some(streams)) ? [serverSentEvent(name)] : []
  },

  /**
   * The default per-route type. Every field is always there, whether or not the route uses it,
   * so a client can read `p.request.query` without first asking whether this route has one:
   *
   * ```ts
   * {
   *   method: "POST";
   *   url: "/api/auth/admin/set-role";
   *   request: { body: {...}; contentType?: "application/json"; params?: never; query?: Record<string, string>; headers?: Record<string, string> };
   *   response: { 200: SetUserRole };
   *   responses: { 200: { content: { "application/json": SetUserRole }; headers: {} } };
   * }
   * ```
   *
   * `response` is the body by status, the usual read; `responses` is the whole of each response
   * the way the document lays it out, content type and headers included.
   */
  shape: (route: Route, options: Shape = {}): ts.TypeNode =>
    Ast.obj([
      { name: 'method', type: Ast.literal(route.method.toUpperCase()) },
      { name: 'url', type: Ast.literal(route.url) },
      { name: 'request', type: Emit.input(route) },
      { name: 'response', type: Emit.output(route, options) },
      { name: 'responses', type: Emit.responses(route, options) },
    ]),

  /** The default file: the declarations, the event type when something streams, then the routes interface. */
  file: (api: Api, options: Shape = {}): ts.Statement[] => [
    ...Emit.decls(api),
    ...Emit.events(api, options),
    Emit.routes(api, options),
  ],

  /**
   * What a route is called with: `body`, `contentType`, `params`, `query` and `headers`, always all five.
   *
   * A slot the document says nothing about falls back to whatever the emitted builder can
   * still do with it. Extra `query` entries are serialised and extra `headers` are spread, so
   * those stay open as `Record<string, string>`; a `params` entry the url has no placeholder
   * for and a `body` on a route that sends none would be dropped on the floor, so those close
   * to `never` rather than accepting a value that goes nowhere.
   *
   * `contentType` says which of the route's bodies is being sent. The preferred one — the first
   * JSON body, else the first — may leave it off; a route that takes several becomes a union
   * keyed on it, so the body is checked against the content type it goes out as:
   *
   * ```ts
   * { params: { id: string } } & (
   *   | { body: Thing; contentType?: "application/json" }
   *   | { body: Blob; contentType: "application/octet-stream" }
   * )
   * ```
   */
  input: (route: Route): ts.TypeNode => {
    const rest = [
      slot(route, 'path', 'params', Ast.NEVER),
      slot(route, 'query', 'query', Ast.dict()),
      slot(route, 'header', 'headers', Ast.dict()),
      ...(Route.params(route, 'cookie').length ? [slot(route, 'cookie', 'cookies', Ast.NEVER)] : []),
    ]
    const [only, ...more] = variants(route)

    if (!more.length) return Ast.obj([...(only ?? NOTHING), ...rest])

    return Ast.intersection([Ast.obj(rest), Ast.union([only ?? NOTHING, ...more].map(Ast.obj))])
  },

  /**
   * Each response by status the way the document lays it out: the body under each content type
   * it can come as, and the headers sent with it. A status with no content has an empty `content`.
   *
   * ```ts
   * { 200: { content: { "application/json": Thing; "text/plain": string }; headers: { ETag?: string } } }
   * ```
   */
  responses: (route: Route, options: Shape = {}): ts.TypeNode =>
    Ast.obj(
      Route.statuses(route).map(([status, group]) => ({
        name: status,
        docs: group[0]?.docs,
        type: Ast.obj([
          {
            name: 'content',
            type: Ast.obj(group.flatMap((r) => (r.media === null ? [] : [{ name: r.media, type: sent(r, options) }]))),
          },
          { name: 'headers', type: Ast.obj((group[0]?.headers ?? []).map(field)) },
        ]),
      })),
    ),

  /**
   * What a route answers with, keyed by status. Always present, empty for a route with no replies.
   * A stream's body is typed as one event, `ServerSentEvent<Tick>`; the response is a run of them.
   */
  output: (route: Route, options: Shape = {}): ts.TypeNode =>
    Ast.obj(
      Route.statuses(route).map(([status, group]) => ({
        name: status,
        type: Ast.collapse(Ast.union(group.map((reply) => sent(reply, options)))),
        docs: group[0]?.docs,
      })),
    ),

  /**
   * Where each route's entry sits inside the root interface: group nesting, collision suffixes
   * and all. Every emitter goes through this, so the type of a route and the value built for it
   * are always reachable at the same key.
   */
  keys: (routes: Route[]): Map<string, string[]> => {
    const claimed = new Map<string, Set<string>>()
    const groups = new Set<string>()
    const out = new Map<string, string[]>()

    const claim = (at: string[], name: string, group: boolean): string => {
      const level = at.join('\0')
      const taken = claimed.get(level) ?? new Set<string>()

      claimed.set(level, taken)

      if (group && groups.has(`${level}\0${name}`)) return name

      const free = Name.free(taken, name)

      taken.add(free)

      if (group) groups.add(`${level}\0${free}`)

      return free
    }

    for (const route of routes) {
      const at: string[] = []

      for (const group of route.group) at.push(claim(at, group, true))

      out.set(route.id, [...at, claim(at, Route.name(route), false)])
    }

    return out
  },

  /**
   * A `const` of request builders, one per route, under the same keys as the types. Each takes
   * the route's own request type — read off the emitted interface rather than spelled out again,
   * so the two cannot drift — and returns a plain object a `fetch` can take:
   *
   * ```ts
   * export const requests = {
   *   "PUT /api/db/container-config": (p: Routes["PUT /api/db/container-config"]["request"]) => ({
   *     method: "PUT",
   *     url: `/api/db/container-config${search(p.query)}`,
   *     headers: { "Content-Type": "application/json", ...p.headers },
   *     body: JSON.stringify(p.body),
   *   }),
   * }
   * ```
   *
   * Each body is encoded for its content type: JSON as text, a form as `URLSearchParams`,
   * multipart as `FormData` with no `Content-Type` of its own so the runtime can add the
   * boundary, and anything else handed on as it came. A route taking several bodies picks
   * by `contentType` at runtime.
   *
   * Statements rather than one, because the search string and the body encodings are built
   * by helpers; each is emitted only when something uses it.
   */
  requests: (api: Api, options: RequestOptions = {}): ts.Statement[] => {
    const taken = new Set(api.decls.map((decl) => decl.name))
    const free = (name: string) => {
      const out = Name.free(taken, name)

      taken.add(out)

      return out
    }
    const own = !options.request
    const wanted = options.search ?? (own && api.routes.length > 0 && SEARCH)
    const search = wanted ? free(wanted) : false
    const uses = (test: (media: string) => boolean) =>
      own && api.routes.some((route) => route.bodies.length === 1 && route.bodies.some((b) => test(b.media)))
    const send = own && api.routes.some((route) => route.bodies.length > 1)
    const encoders: Encoders = {
      urlEncoded: send || uses(Media.form) ? free('urlEncoded') : undefined,
      formData: send || uses(Media.multipart) ? free('formData') : undefined,
    }
    if (send) encoders.send = free('send')
    const keys = Emit.keys(api.routes)
    const build =
      options.request ??
      ((route: Route) => Emit.request(route, { ...options, search, encoders, at: keys.get(route.id) }))

    return [
      ...(search ? Ast.source(searching(search)) : []),
      ...(encoders.urlEncoded ? Ast.source(urlEncoding(encoders.urlEncoded)) : []),
      ...(encoders.formData ? Ast.source(formEncoding(encoders.formData)) : []),
      ...(encoders.send ? Ast.source(sending(encoders as Required<Encoders>)) : []),
      Ast.constant(
        options.name ?? 'requests',
        Ast.record(render(nest(api.routes, build), entry, (name, of) => ({ name, value: Ast.record(of) }))),
      ),
    ]
  },

  /** The default builder for one route: the function `Emit.requests` puts under each name. */
  request: (route: Route, options: RequestOptions = {}): ts.Expression => {
    const names = { ...ENCODERS, ...options.encoders }
    const [only, ...more] = route.bodies
    const extra = { spread: Ast.member(P, 'headers') }
    const picked = Ast.coalesce(Ast.member(P, 'contentType'), Ast.str(preferred(route)?.media ?? ''))

    const sent: Ast.Entry[] = more.length
      ? [{ spread: Ast.call(Ast.id(names.send), [picked, Ast.member(P, 'body'), Ast.member(P, 'headers')]) }]
      : [
          {
            name: 'headers',
            value: Ast.record(
              only && !Media.multipart(only.media)
                ? [{ name: 'Content-Type', value: Ast.str(only.media) }, extra]
                : [extra],
            ),
          },
          ...(only ? [{ name: 'body', value: payload(only, names) }] : []),
        ]

    return Ast.arrow(
      [Ast.param('_p', input(route, options), { fallback: needed(route) ? undefined : Ast.record([]) })],
      Ast.record([
        { name: 'method', value: Ast.str(route.method.toUpperCase()) },
        { name: 'url', value: Ast.template(url(route, options)) },
        ...sent,
      ]),
    )
  },

  /** The pointers left over with no declaration behind them. `print` reports these; they emit as `unknown`. */
  unresolved: (api: Api): string[] => {
    const known = new Set(api.decls.map((decl) => decl.id))
    const out = new Set<string>()

    for (const type of [...api.decls.map((d) => d.type), ...api.routes.flatMap(Route.types)])
      for (const node of Ast.walk(type)) {
        const pointer = Ast.pointerOf(node)

        if (pointer && !known.has(pointer)) out.add(pointer)
      }

    return [...out]
  },
}

export type RequestOptions = {
  /** The const the builders are emitted into. Defaults to `requests`. */
  name?: string
  /** The expression emitted for one route. Replace it to change the request shape wholesale. */
  request?: (route: Route) => ts.Expression
  /**
   * Name for the helper that turns the `query` parameters into a search string. It is given a
   * free name and emitted alongside when a route needs it; `false` leaves the query out of the url.
   */
  search?: string | false
  /** The interface the request types are read off. Defaults to `Routes`. */
  root?: string
  /**
   * This route's key path inside that interface, so the builder can take
   * `Routes["GET /things"]["request"]` rather than spell the type out again.
   * `Emit.requests` fills it from `Emit.keys`; without it the type is inlined.
   */
  at?: string[]
  /** The names the body encoders were emitted under. `Emit.requests` fills it; the defaults are the bare names. */
  encoders?: Encoders
}

/** The helpers that encode a request body, by the name each was emitted under. */
export type Encoders = { urlEncoded?: string; formData?: string; send?: string }

const ENCODERS: Required<Encoders> = { urlEncoded: 'urlEncoded', formData: 'formData', send: 'send' }

/**
 * Settles every name and resolves every reference.
 *
 * Declarations name themselves whatever they like up to this point; here those names are
 * made legal and pulled apart where two collide, and the pointer placeholders left by `read`
 * and `Decl.ref` are pointed at the result. A pointer with no declaration behind it — dropped
 * by an op, or into a component kind the model does not name — degrades to `unknown` rather
 * than emitting a reference that will not compile.
 */
export const bind = (api: Api): Api => {
  const taken = new Set<string>()
  const names = new Map<string, string>()

  for (const decl of api.decls) {
    const name = Name.free(taken, Name.identifier(decl.name))

    taken.add(name)
    names.set(decl.id, name)
  }

  const resolved = mapTypes(api, (type) =>
    Ast.rewrite(type, (node) => {
      const pointer = Ast.pointerOf(node)

      if (!pointer) return node

      const name = names.get(pointer)

      return name ? Ast.ref(name) : Ast.UNKNOWN
    }),
  )

  return { ...resolved, decls: resolved.decls.map((decl) => ({ ...decl, name: names.get(decl.id) ?? decl.name })) }
}

const EVENTS = 'ServerSentEvent'

/** The name the event type goes under: free of every declaration, so a schema called `ServerSentEvent` keeps its own. */
const events = (api: Api, options: Shape): string | false =>
  options.events === false ? false : Name.free(new Set(api.decls.map((decl) => decl.name)), options.events ?? EVENTS)

const streams = (reply: Reply): boolean => reply.media !== null && Media.stream(reply.media)

/** A reply's body as the route type shows it: a stream's wrapped as one event of it. */
const sent = (reply: Reply, options: Shape): ts.TypeNode =>
  streams(reply) && options.events !== false ? Ast.ref(options.events ?? EVENTS, [reply.type]) : reply.type

const serverSentEvent = (name: string): ts.Statement =>
  Ast.alias(
    name,
    Ast.obj([
      { name: 'data', type: Ast.ref('T'), docs: 'The `data:` field, parsed as the document describes it.' },
      {
        name: 'event',
        type: Ast.STRING,
        optional: true,
        docs: 'The `event:` field: the kind of event, `message` when the server names none.',
      },
      {
        name: 'id',
        type: Ast.STRING,
        optional: true,
        docs: 'The `id:` field, sent back as `Last-Event-ID` on reconnect.',
      },
      {
        name: 'retry',
        type: Ast.NUMBER,
        optional: true,
        docs: 'The `retry:` field: how long to wait before reconnecting, in milliseconds.',
      },
    ]),
    'One event off a `text/event-stream` response. The body is a run of these.',
    ['T'],
  )

const declare = (decl: Decl): ts.Statement => {
  const docs = { description: decl.docs, deprecated: decl.deprecated }

  return decl.kind === 'interface' && ts.isTypeLiteralNode(decl.type)
    ? Ast.docs(Ast.iface(decl.name, decl.type.members), docs)
    : Ast.alias(decl.name, decl.type, docs)
}

/** One parameter location as a field, falling back to `empty` where the route declares none. */
const slot = (route: Route, where: In, name: string, empty: ts.TypeNode): Ast.Field => {
  const group = Route.params(route, where)

  return group.length
    ? { name, type: Ast.obj(group.map(field)), optional: group.every((p) => !p.required) }
    : { name, type: empty, optional: true }
}

const field = (param: Param | Header): Ast.Field => ({
  name: param.name,
  type: param.type,
  optional: !param.required,
  docs: { description: param.docs, deprecated: param.deprecated },
})

/** The body a builder sends when not told otherwise: the first JSON one, else the first. */
const preferred = (route: Route): Body | undefined => route.bodies.find((b) => Media.json(b.media)) ?? route.bodies[0]

/** The `body` and `contentType` fields, one pair per body the route takes. */
const variants = (route: Route): Ast.Field[][] => {
  const fallback = preferred(route)
  const optional = !route.bodies.some((b) => b.required)

  return route.bodies.map((b) => [
    { name: 'body', type: b.type, optional },
    { name: 'contentType', type: Ast.literal(b.media), optional: b === fallback },
  ])
}

/** A route that sends no body takes neither field. */
const NOTHING: Ast.Field[] = [
  { name: 'body', type: Ast.NEVER, optional: true },
  { name: 'contentType', type: Ast.NEVER, optional: true },
]

/** Whether the route makes the caller pass anything at all. */
const needed = (route: Route): boolean => route.bodies.some((b) => b.required) || route.params.some((p) => p.required)

/** The builder's parameter type: read off the emitted interface when we know where it lives. */
const input = (route: Route, options: RequestOptions): ts.TypeNode =>
  options.at ? Ast.index(Ast.ref(options.root ?? 'Routes'), [...options.at, 'request']) : Emit.input(route)

type Branch<T> = Map<string, Branch<T> | { leaf: T }>

/**
 * Nests routes by `group` then `name`, carrying whatever `leaf` makes of each route.
 * Colliding names take a numeric suffix rather than vanishing.
 *
 * Every emitter nests through here, so the type of a route and the value built for it
 * always land under the same key, suffix included.
 */
const nest = <T>(routes: Route[], leaf: (route: Route) => T): Branch<T> => {
  const root: Branch<T> = new Map()

  for (const route of routes) insert(root, [...route.group, Route.name(route)], { leaf: leaf(route) })

  return root
}

const insert = <T>(branch: Branch<T>, path: string[], leaf: { leaf: T }): void => {
  const [head, ...rest] = path

  if (head === undefined) return
  if (!rest.length) return void branch.set(Name.free(new Set(branch.keys()), head), leaf)

  const existing = branch.get(head)
  const child = existing instanceof Map ? existing : new Map<string, Branch<T> | { leaf: T }>()

  branch.set(head, child)
  insert(child, rest, leaf)
}

/** Walks a nest, building one node per leaf and one per group. */
const render = <T, R>(branch: Branch<T>, one: (name: string, leaf: T) => R, group: (name: string, of: R[]) => R): R[] =>
  [...branch].map(([name, node]) =>
    node instanceof Map ? group(name, render(node, one, group)) : one(name, node.leaf),
  )

/** The argument every emitted builder takes. */
const P = Ast.id('_p')

const SEARCH = 'search'

const entry = (name: string, value: ts.Expression): Ast.Entry => ({ name, value })

/**
 * The url as template parts, with each `{param}` the document declares swapped for the value
 * passed in. A brace pair naming no path parameter is left as the text it is, rather than
 * emitting a read that would not compile.
 */
const url = (route: Route, options: RequestOptions): (string | ts.Expression)[] => {
  const named = new Set(Route.params(route, 'path').map((param) => param.name))
  const parts: (string | ts.Expression)[] = []
  let taken = 0

  for (const match of route.url.matchAll(/\{([^}]+)\}/g)) {
    if (!named.has(match[1] ?? '')) continue

    parts.push(route.url.slice(taken, match.index), Ast.member(Ast.member(P, 'params'), match[1] ?? ''))
    taken = match.index + match[0].length
  }

  parts.push(route.url.slice(taken))

  if (options.search) parts.push(Ast.call(Ast.id(options.search), [Ast.member(P, 'query')]))

  return parts
}

/** JSON bodies go over the wire as text, forms and multipart through their encoders; anything else as it came. */
const payload = (sending: Body, names: Required<Encoders>): ts.Expression => {
  const value = Ast.member(P, 'body')

  if (Media.json(sending.media)) return Ast.call(Ast.member(Ast.id('JSON'), 'stringify'), [value])
  if (Media.form(sending.media)) return Ast.call(Ast.id(names.urlEncoded), [value])
  if (Media.multipart(sending.media)) return Ast.call(Ast.id(names.formData), [value])

  return value
}

const searching = (name: string) => `
/** Renders the query parameters as a search string, leaving off the ones not passed. */
const ${name} = (params: Record<string, unknown> | undefined): string => {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params ?? {}))
    for (const item of Array.isArray(value) ? value : [value])
      if (item !== undefined && item !== null) query.append(key, String(item))

  return query.size ? \`?\${query}\` : ''
}
`

const urlEncoding = (name: string) => `
/** Encodes an object as a form body, one field per entry and one per array item, leaving off the ones not passed. */
const ${name} = (value: object | undefined): URLSearchParams => {
  const form = new URLSearchParams()

  for (const [key, entry] of Object.entries(value ?? {}))
    for (const item of Array.isArray(entry) ? entry : [entry])
      if (item !== undefined && item !== null) form.append(key, String(item))

  return form
}
`

const formEncoding = (name: string) => `
/** Frames an object as multipart form data: bytes as files, objects as JSON, anything else as text. */
const ${name} = (value: object | undefined): FormData => {
  const form = new FormData()

  for (const [key, entry] of Object.entries(value ?? {}))
    for (const item of Array.isArray(entry) ? entry : [entry])
      if (item instanceof Blob) form.append(key, item)
      else if (item !== undefined && item !== null)
        form.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item))

  return form
}
`

const sending = (names: Required<Encoders>) => `
/** A body encoded for the content type picked for it, with the \`Content-Type\` to send it under. Multipart sets its own. */
const ${names.send} = (type: string, body: unknown, headers?: object): { headers: Record<string, string>; body?: BodyInit } => {
  const multipart = /^multipart\\//i.test(type)
  const encoded =
    /^[^;]*[/+]json\\s*(;|$)/i.test(type) ? JSON.stringify(body)
    : /^application\\/x-www-form-urlencoded\\s*(;|$)/i.test(type) ? ${names.urlEncoded}(body as object)
    : multipart ? ${names.formData}(body as object)
    : (body as BodyInit | undefined)

  return { headers: { ...(multipart ? {} : { 'Content-Type': type }), ...(headers as Record<string, string>) }, body: encoded }
}
`

const tree = (routes: Route[], route: (r: Route) => ts.TypeNode): ts.TypeElement[] =>
  render<{ type: ts.TypeNode; docs?: Ast.Docs }, ts.TypeElement>(
    nest(routes, (r) => ({
      type: route(r),
      docs: { summary: r.summary, description: r.docs, deprecated: r.deprecated },
    })),
    (name, leaf) => Ast.prop({ name, type: leaf.type, docs: leaf.docs }),
    (name, of) => Ast.prop({ name, type: ts.factory.createTypeLiteralNode(of) }),
  )
