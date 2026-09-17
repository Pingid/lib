import { Compute, Intersect, Struct } from './util.cjs';
import type * as Route from './route.cjs';
/**
 * Context arrives as a second argument, never a closure — the shape `ProxyHandler` in
 * `@pingid/lib-proxy` uses, for the reason its `ProxyContext` doc gives: a route is built once
 * and applied many times, so anything in its closure is frozen for the life of the process. A
 * shared convention, not a dependency. The conditional makes a forgotten context a compile
 * error rather than a silent `undefined`.
 *
 * @example
 * ```ts
 * const handler = Fetch.handler(get)
 * await handler(new Request('http://localhost/orgs/acme'), { db })
 * ```
 */
export type Handler<D extends Struct = {}> = {} extends D ? (request: Request, context?: D) => Promise<Response> : (request: Request, context: D) => Promise<Response>;
export type Ctx<T> = T extends Route.Type<any, any, any, any, infer D> ? D : {};
/** One route as a standalone handler. Anything it does not match is a 404. */
export declare const handler: <I extends Struct, O, C extends Struct, P extends string, D extends Struct>(route: Route.Type<I, O, C, P, D>) => Handler<D>;
/**
 * Several routes, tried in order. Their context requirements intersect, as `Api.group` does.
 *
 * @example
 * ```ts
 * const handler = Fetch.router(get, create) // (request, { db }) => Promise<Response>
 * ```
 */
export declare const router: <const R extends readonly Route.Node[]>(...routes: R) => Handler<Compute<Intersect<Ctx<R[number]>>>>;
