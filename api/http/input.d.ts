import { Struct } from './util.js';
import type * as Route from './route.js';
/**
 * The flat input a handler receives, drawn from wherever the bindings say. Sources are
 * disjoint by construction, so there is no precedence rule. Nothing ever writes `undefined` —
 * an absent value omits the key, so `required` fires and `default` applies.
 *
 * @example
 * ```ts
 * // GET /orgs/acme/repos/lib?page=2  with  x-request-id: abc
 * await assemble(route, request) // { org: 'acme', repo: 'lib', page: 2, requestId: 'abc' }
 * ```
 */
export declare const assemble: (route: Route.Node, request: Request, matched?: Record<string, string>) => Promise<Struct>;
/**
 * The flat input, rebuilt from parts a framework has already parsed and validated. Re-reading
 * the `Request` with `assemble` would work, but would decode and validate twice — reading the
 * parts back is what makes handing the schemas over worth doing.
 *
 * @example
 * ```ts
 * flatten(route, { path: ctx.params, query: ctx.query, body: ctx.body }, ctx.request)
 * ```
 */
export declare const flatten: (route: Route.Node, parts: Partial<Record<Route.Source, unknown>>, request?: Request) => Struct;
