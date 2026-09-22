import ts from 'typescript'

import * as Ast from './ast.ts'
import { Name, Route, mapTypes, type Api, type Body, type Decl, type In, type Param } from './model.ts'

/** How the routes are laid out. Shared by `Emit.routes` and `PrintOptions`. */
export type Shape = {
  /** Interface the routes are emitted into. Defaults to `Routes`. */
  root?: string
  /** The type emitted for one route. Replace it to change the generated shape wholesale. */
  route?: (route: Route) => ts.TypeNode
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
  routes: (api: Api, options: Shape = {}): ts.Statement =>
    Ast.iface(options.root ?? 'Routes', tree(api.routes, options.route ?? Emit.shape)),

  /**
   * The default per-route type. Every field is always there, whether or not the route uses it,
   * so a client can read `p.request.query` without first asking whether this route has one:
   *
   * ```ts
   * {
   *   method: "POST";
   *   url: "/api/auth/admin/set-role";
   *   request: { body: {...}; params?: never; query?: Record<string, string>; headers?: Record<string, string> };
   *   response: { 200: SetUserRole };
   * }
   * ```
   */
  shape: (route: Route): ts.TypeNode =>
    Ast.obj([
      { name: 'method', type: Ast.literal(route.method.toUpperCase()) },
      { name: 'url', type: Ast.literal(route.url) },
      { name: 'request', type: Emit.input(route) },
      { name: 'response', type: Emit.output(route) },
    ]),

  /** The default file: the declarations, then the routes interface. */
  file: (api: Api, options: Shape = {}): ts.Statement[] => [...Emit.decls(api), Emit.routes(api, options)],

  /**
   * What a route is called with: `body`, `params`, `query` and `headers`, always all four.
   *
   * A slot the document says nothing about falls back to whatever the emitted builder can
   * still do with it. Extra `query` entries are serialised and extra `headers` are spread, so
   * those stay open as `Record<string, string>`; a `params` entry the url has no placeholder
   * for and a `body` on a route that sends none would be dropped on the floor, so those close
   * to `never` rather than accepting a value that goes nowhere.
   */
  input: (route: Route): ts.TypeNode =>
    Ast.obj([
      body(route),
      slot(route, 'path', 'params', Ast.NEVER),
      slot(route, 'query', 'query', Ast.dict()),
      slot(route, 'header', 'headers', Ast.dict()),
      ...(Route.params(route, 'cookie').length ? [slot(route, 'cookie', 'cookies', Ast.NEVER)] : []),
    ]),

  /** What a route answers with, keyed by status. Always present, empty for a route with no replies. */
  output: (route: Route): ts.TypeNode =>
    Ast.obj(
      Route.statuses(route).map(([status, group]) => ({
        name: status,
        type: Ast.union(group.map((reply) => reply.type)),
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
   *     url: "/api/db/container-config",
   *     headers: { "Content-Type": "application/json" },
   *     body: JSON.stringify(p.body),
   *   }),
   * }
   * ```
   *
   * Statements rather than one, because a route with query parameters needs the helper that
   * builds the search string; it is emitted only when something uses it.
   */
  requests: (api: Api, options: RequestOptions = {}): ts.Statement[] => {
    const wanted = options.search ?? (api.routes.some((route) => Route.params(route, 'query').length) && SEARCH)
    const search = wanted ? Name.free(new Set(api.decls.map((decl) => decl.name)), wanted) : false
    const keys = Emit.keys(api.routes)
    const build =
      options.request ?? ((route: Route) => Emit.request(route, { ...options, search, at: keys.get(route.id) }))

    return [
      ...(search ? Ast.source(searching(search)) : []),
      Ast.constant(
        options.name ?? 'requests',
        Ast.record(render(nest(api.routes, build), entry, (name, of) => ({ name, value: Ast.record(of) }))),
      ),
    ]
  },

  /** The default builder for one route: the function `Emit.requests` puts under each name. */
  request: (route: Route, options: RequestOptions = {}): ts.Expression => {
    const sending = Route.body(route) ?? route.bodies[0]
    const headers: Ast.Entry[] = []

    if (sending) headers.push({ name: 'Content-Type', value: Ast.str(sending.media) })
    if (Route.params(route, 'header').length) headers.push({ spread: Ast.member(P, 'headers') })

    return Ast.arrow(
      [Ast.param('_p', input(route, options), { fallback: needed(route) ? undefined : Ast.record([]) })],
      Ast.record([
        { name: 'method', value: Ast.str(route.method.toUpperCase()) },
        { name: 'url', value: Ast.template(url(route, options)) },
        ...(headers.length ? [{ name: 'headers', value: Ast.record(headers) }] : []),
        ...(sending ? [{ name: 'body', value: payload(sending) }] : []),
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
}

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

const declare = (decl: Decl): ts.Statement =>
  decl.kind === 'interface' && ts.isTypeLiteralNode(decl.type)
    ? Ast.docs(Ast.iface(decl.name, decl.type.members), decl.docs)
    : Ast.alias(decl.name, decl.type, decl.docs)

/** One parameter location as a field, falling back to `empty` where the route declares none. */
const slot = (route: Route, where: In, name: string, empty: ts.TypeNode): Ast.Field => {
  const group = Route.params(route, where)

  return group.length
    ? { name, type: Ast.obj(group.map(field)), optional: group.every((p) => !p.required) }
    : { name, type: empty, optional: true }
}

const field = (param: Param): Ast.Field => ({
  name: param.name,
  type: param.type,
  optional: !param.required,
  docs: param.docs,
})

const body = (route: Route): Ast.Field =>
  route.bodies.length
    ? {
        name: 'body',
        type: Ast.union(route.bodies.map((b) => b.type)),
        optional: !route.bodies.some((b) => b.required),
      }
    : { name: 'body', type: Ast.NEVER, optional: true }

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

  if (options.search && Route.params(route, 'query').length)
    parts.push(Ast.call(Ast.id(options.search), [Ast.member(P, 'query')]))

  return parts
}

/** JSON bodies go over the wire as text; anything else is handed on as it came. */
const payload = (sending: Body): ts.Expression =>
  /json/.test(sending.media)
    ? Ast.call(Ast.member(Ast.id('JSON'), 'stringify'), [Ast.member(P, 'body')])
    : Ast.member(P, 'body')

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

const tree = (routes: Route[], route: (r: Route) => ts.TypeNode): ts.TypeElement[] =>
  render<{ type: ts.TypeNode; docs?: string }, ts.TypeElement>(
    nest(routes, (r) => ({ type: route(r), docs: r.docs })),
    (name, leaf) => Ast.prop({ name, type: leaf.type, docs: leaf.docs }),
    (name, of) => Ast.prop({ name, type: ts.factory.createTypeLiteralNode(of) }),
  )
