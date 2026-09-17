import { Override } from '../route/inject.js';
import * as Route from '../route/index.js';
type P<T> = T | Promise<T>;
/** A request handler as the router runs it. */
export type Fetch = (req: Request) => Promise<Response>;
/**
 * Wraps the rest of the chain: CORS, timing, guards, error pages. Throw or return a `Response` to stop.
 * Data belongs in providers; read one here with `inject(req, provider)` and the route shares the result.
 *
 * Chains are composed once, when the router compiles, never per request.
 *
 * @example
 * const timing: Middleware = (next) => async (req) => {
 *   const t = performance.now()
 *   const res = await next(req)
 *   res.headers.set('server-timing', `app;dur=${performance.now() - t}`)
 *   return res
 * }
 */
export type Middleware = (next: Fetch) => (req: Request) => P<Response>;
/** Outermost first. */
export declare const compose: (use: readonly Middleware[], handler: Fetch) => Fetch;
/** Continue only when `check` passes; otherwise answer with its `Response`, or 403. */
export declare const guard: (check: (req: Request) => P<boolean | Response>) => Middleware;
/** A route or a nested router. */
export type Node = Route.Route<any, any, any> | Router<any>;
export interface RouterOptions<R extends readonly Node[] = readonly Node[]> {
    /** Prepended to every route below. */
    prefix?: string;
    /** Middleware for every route below, after the parent's. */
    use?: readonly Middleware[];
    /** Providers swapped for every route below, e.g. fakes in tests. */
    override?: readonly Override[];
    /** Answer for unmatched paths. Read from the router `fetch` is called on. */
    notFound?: Fetch;
    routes: R;
}
/**
 * Configuration only: nothing runs per request until `fetch` first compiles the tree into a flat table.
 *
 * `N` is the context the routes need from outside `inject`. A router provides it with `context`, and
 * `fetch` is only callable once nothing is missing.
 */
export interface Router<N = {}> {
    readonly options: RouterOptions & {
        context?: (req: Request) => unknown;
    };
    readonly fetch: {} extends N ? Fetch : MissingContext<N>;
    /** Phantom, for inference. */
    readonly '~needs'?: N;
}
type MissingContext<N> = {
    error: 'Pass `context` to a router: these routes need it';
    needs: N;
};
/** The context a set of nodes needs from outside `inject`. */
export type Needs<R extends readonly Node[]> = Route.Intersect<{
    [K in keyof R]: NeedsOf<R[K]>;
}[number]>;
type NeedsOf<T> = T extends Router<infer N> ? N : T extends Route.Route<any, infer C, any> ? C : never;
/**
 * @example
 * const api = Router({
 *   prefix: '/api',
 *   use: [timing],
 *   routes: [List, Router({ use: [guard(isSignedIn)], routes: [Create, Update] })],
 * })
 * Bun.serve({ fetch: api.fetch })
 */
export declare const Router: {
    <const R extends readonly Node[]>(options: RouterOptions<R> & {
        context: (req: Request) => P<Needs<R>>;
    }): Router<{}>;
    <const R extends readonly Node[]>(options: RouterOptions<R>): Router<Needs<R>>;
};
/** A route as mounted: its full path and everything its ancestors apply, outermost first. */
export interface Entry {
    method: string;
    path: string;
    route: Route.Route<any, any, any>;
    use: readonly Middleware[];
    override: readonly Override[];
    context?: ((req: Request) => unknown) | undefined;
}
type Scope = Omit<Entry, 'method' | 'route'>;
/** The tree as one list, in declaration order. Adapters can mount this directly. */
export declare const flatten: (node: Router<any>, parent?: Scope) => Entry[];
export {};
