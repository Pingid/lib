/**
 * Serving an `Api` method over HTTP.
 *
 * A method declares one flat input; a route says which part of the request each key comes
 * from. Nothing here knows about a framework — the adapters live in their own subpaths, so
 * this entry point stays dependency-free.
 *
 * @example Declare a method, then expose it
 * ```ts
 * const getRepo = Api.method({
 *   name: 'get',
 *   in: Type.Object({ org: Type.String(), repo: Type.String(), page: Type.Optional(Type.Integer()) }),
 *   out: Type.Object({ stars: Type.Integer() }),
 *   handle: async ({ org, repo, page }, ctx: { db: Db }) => ctx.db.repo(org, repo, page),
 * })
 *
 * const get = Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['page'] })
 * ```
 *
 * @example Field order is claim priority — path, query, header, cookie, raw, body
 * ```ts
 * Route.of(create, { method: 'POST', path: '/orgs/:org/repos', body: true })
 * Route.of(get, { method: 'GET', path: '/r/:org', header: { requestId: 'x-request-id' }, rest: 'query' })
 * ```
 *
 * @example A key bound to no source is a compile error that names it
 * ```ts
 * Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo' })
 * // Property "bind 'page' to a source, or set rest" is missing
 * ```
 *
 * @example Context: `with` for a pool, `from` for whatever the framework carries
 * ```ts
 * Route.of(getRepo, spec).with({ db })
 * Route.of(getRepo, spec).from((c: { var: { db: Db } }) => ({ db: c.var.db }))
 * ```
 *
 * @example Mount it — on a framework, or on nothing
 * ```ts
 * import * as Elysia from '@pingid/lib-api/http/elysia'
 * new App().decorate('db', db).get(...Elysia.route(get)) // Eden Treaty keeps its types
 *
 * import * as Hono from '@pingid/lib-api/http/hono'
 * new HonoApp().get('/orgs/:org/repos/:repo', Hono.route(get)) // `hc` keeps its types
 *
 * const handler = Fetch.router(get, create) // (request, { db }) => Promise<Response>
 * ```
 *
 * @module
 */
export * as Route from './route.cjs';
export * as Path from './path.cjs';
export * as Split from './split.cjs';
export * as Input from './input.cjs';
export * as Respond from './respond.cjs';
export * as Fetch from './fetch.cjs';
export { HttpError } from './error.cjs';
export type { Compute, Intersect, Struct } from './util.cjs';
