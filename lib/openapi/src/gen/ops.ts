import type ts from 'typescript'

import * as Ast from './ast.ts'
import { Decl, Name, Pattern, Route, mapTypes, type Api, type Param, type Reply, type Site } from './model.ts'

/** Every transform in the pipeline is one of these, so composing them is just function composition. */
export type Op = (api: Api) => Api

/** Selects routes: a url matched exactly or by pattern, or any predicate over the route. */
export type Test = string | RegExp | ((route: Route) => boolean)

/** Applies `ops` left to right. `Op.pipe()` is the identity. */
const pipe =
  (...ops: Op[]): Op =>
  (api) =>
    ops.reduce((acc, op) => op(acc), api)

/**
 * The combinator vocabulary. Every member is or returns an `Op`, so a pipeline is
 * just a list of these handed to `generate` or `Op.pipe`.
 */
export const Op = {
  pipe,

  /**
   * Narrows the pipeline to the routes that match; the rest pass through untouched.
   *
   * Inner ops may drop or add routes, but must keep `id` intact — that is how results
   * are spliced back into their original positions.
   */
  where:
    (test: Test, ...ops: Op[]): Op =>
    (api) => {
      const hit = predicate(test)
      const matched = api.routes.filter(hit)

      if (!matched.length) return api

      const inner = pipe(...ops)({ ...api, routes: matched })
      const byId = new Map(inner.routes.map((route) => [route.id, route]))
      const known = new Set(matched.map((route) => route.id))

      return {
        ...inner,
        routes: [
          ...api.routes.flatMap((route) => (hit(route) ? (byId.get(route.id) ?? []) : route)),
          ...inner.routes.filter((route) => !known.has(route.id)),
        ],
      }
    },

  /** Keeps the routes that match. */
  keep:
    (test: Test): Op =>
    (api) => ({ ...api, routes: api.routes.filter(predicate(test)) }),

  /** Removes the routes that match. */
  drop:
    (test: Test): Op =>
    (api) => ({ ...api, routes: api.routes.filter((route) => !predicate(test)(route)) }),

  /** Rewrites the request url. */
  url: (f: (url: string, route: Route) => string): Op => onRoute((route) => ({ ...route, url: f(route.url, route) })),

  /** Pins the name the route is emitted under. Left alone it follows the url. */
  rename: (f: (name: string, route: Route) => string): Op =>
    onRoute((route) => ({ ...route, name: f(Route.name(route), route) })),

  /** Nests the emitted member under the returned segments. */
  group: (f: (route: Route) => string | string[]): Op => onRoute((route) => ({ ...route, group: [f(route)].flat() })),

  /** Rewrites a route wholesale. Returning `null` drops it. */
  route: (f: (route: Route) => Route | null): Op => onRoute(f),

  /** Keeps the request and response bodies whose content type matches. Statuses with no content survive. */
  media: (test: Pattern): Op =>
    onRoute((route) => ({
      ...route,
      bodies: route.bodies.filter((body) => Pattern.match(test)(body.media)),
      replies: route.replies.filter((reply) => reply.media === null || Pattern.match(test)(reply.media)),
    })),

  /** Keeps the responses whose status matches: `Op.status(/^2/)` leaves only the successes. */
  status: (test: Pattern): Op =>
    onRoute((route) => ({ ...route, replies: route.replies.filter((r) => Pattern.match(test)(r.status)) })),

  /** Rewrites parameters. Returning `null` drops one. */
  params: (f: (param: Param, route: Route) => Param | null): Op =>
    onRoute((route) => ({ ...route, params: route.params.flatMap((param) => f(param, route) ?? []) })),

  /** Rewrites responses. Returning `null` drops one. */
  replies: (f: (reply: Reply, route: Route) => Reply | null): Op =>
    onRoute((route) => ({ ...route, replies: route.replies.flatMap((reply) => f(reply, route) ?? []) })),

  /**
   * Rewrites every type in the model: declarations, parameters, bodies and replies.
   * `at` says where the type sits, for rewrites that only apply in one place.
   */
  types:
    (f: (type: ts.TypeNode, at: Site) => ts.TypeNode): Op =>
    (api) =>
      mapTypes(api, f),

  /**
   * Collapses the matching members of every union and intersection in the model — the
   * shapes that pile up when one union is built from several responses that happen to agree.
   * Pass `{ subsume: true }` to also drop members another member already admits.
   *
   * Types are emitted as they stand when the op runs, so this goes after the `Op.declare`
   * that builds the union, not before.
   */
  collapse:
    (options: Ast.CollapseOptions = {}): Op =>
    (api) =>
      mapTypes(api, (type) => Ast.collapse(type, options)),

  /**
   * Adds top-level declarations, built from the model as it stands. A declaration whose
   * `id` is already in the model replaces it, so running the same op twice changes nothing.
   *
   * ```ts
   * // export interface Schemas { "Thing.Detail": ThingDetail; ... }
   * Op.declare((api) => ({
   *   id: '#/emit/Schemas',
   *   name: 'Schemas',
   *   kind: 'interface',
   *   type: Ast.obj(Decl.schemas(api).map((d) => ({ name: d.origin.name, type: Decl.ref(d) }))),
   * }))
   * ```
   */
  declare:
    (f: (api: Api) => Decl | Decl[] | null): Op =>
    (api) => {
      const made = [f(api) ?? []].flat()
      const byId = new Map(made.map((decl) => [decl.id, decl]))
      const known = new Set(api.decls.map((decl) => decl.id))

      return {
        ...api,
        decls: [...api.decls.map((decl) => byId.get(decl.id) ?? decl), ...made.filter((decl) => !known.has(decl.id))],
      }
    },

  /**
   * Hoists types out of the routes into their own declarations, leaving a reference behind.
   * Returning a name lifts the type; returning `null` leaves it where it is.
   *
   * ```ts
   * // export type GetThingsResponse = ...; then `200: GetThingsResponse` on the route
   * Op.extract((_type, at) =>
   *   at.in === 'reply' && at.reply.status.startsWith('2') ? `${Route.name(at.route)} Response` : null,
   * )
   * ```
   *
   * A type that is already a bare reference gets lifted too, giving an alias of an alias.
   * Check `Ast.pointerOf(type)` in the callback to leave those where they are.
   */
  extract:
    (f: (type: ts.TypeNode, at: Site) => string | null): Op =>
    (api) => {
      const made: Decl[] = []

      const mapped = mapTypes(api, (type, at) => {
        if (at.in === 'decl') return type

        const name = f(type, at)

        if (name === null) return type

        const id = Decl.at(at)

        made.push({ id, name: Name.identifier(name), type, docs: Decl.docs(at), origin: { kind: 'made', at } })

        return Decl.ref(id)
      })

      return { ...mapped, decls: [...mapped.decls, ...made] }
    },

  /** Rewrites top-level declarations. Returning `null` drops one; references to it degrade to `unknown`. */
  decls:
    (f: (decl: Decl, api: Api) => Decl | null): Op =>
    (api) => ({ ...api, decls: api.decls.flatMap((decl) => f(decl, api) ?? []) }),

  /**
   * Renames the declarations that came from `components.schemas`; references follow
   * automatically. Returning `null` drops one.
   */
  schemas: (f: (decl: Decl) => string | null): Op =>
    Op.decls((decl) => {
      if (decl.origin?.kind !== 'schema') return decl

      const name = f(decl)

      return name === null ? null : { ...decl, name: Name.identifier(name) }
    }),

  /**
   * Drops parameters and bodies that carry nothing, then the schemas nothing references.
   * Declarations an operator made are kept whether or not anything reaches them — they are
   * there because the pipeline asked for them. An `Op` already.
   */
  compact: (api: Api): Api => reachable(trim(api)),

  /** Orders routes and declarations by emitted name, so regenerating gives a clean diff. An `Op` already. */
  sort: (api: Api): Api => ({
    decls: [...api.decls].sort(by((decl) => decl.name)),
    routes: [...api.routes].sort(by((route) => [...route.group, Route.name(route)].join('\0'))),
  }),

  /** The operation's first tag, ready for `Op.group(Op.byTag)`. */
  byTag: (route: Route): string[] => route.tags.slice(0, 1).map(Name.identifier),
}

const onRoute =
  (f: (route: Route) => Route | null): Op =>
  (api) => ({ ...api, routes: api.routes.flatMap((route) => f(route) ?? []) })

const predicate = (test: Test): ((route: Route) => boolean) =>
  typeof test === 'function' ? test : (route) => Pattern.match(test)(route.url)

const by =
  <T>(key: (value: T) => string) =>
  (a: T, b: T) =>
    key(a).localeCompare(key(b))

const trim = (api: Api): Api => ({
  ...api,
  routes: api.routes.map((route) => ({
    ...route,
    params: route.params.filter((param) => !Ast.empty(param.type)),
    bodies: route.bodies.filter((body) => !Ast.empty(body.type)),
  })),
})

/** Schemas the routes or the made declarations can still reach, following references between them. */
const reachable = (api: Api): Api => {
  const byId = new Map(api.decls.map((decl) => [decl.id, decl]))
  const pending = [...api.routes.flatMap(Route.types), ...Decl.made(api).map((decl) => decl.type)].flatMap(pointers)
  const seen = new Set<string>()

  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    if (seen.has(id)) continue

    seen.add(id)

    const decl = byId.get(id)

    if (decl) pending.push(...pointers(decl.type))
  }

  return { ...api, decls: api.decls.filter((decl) => decl.origin?.kind !== 'schema' || seen.has(decl.id)) }
}

const pointers = (type: ts.TypeNode): string[] => [...Ast.walk(type)].flatMap((node) => Ast.pointerOf(node) ?? [])
