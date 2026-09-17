import { Route } from './route.js';
import { Compute, Intersect, Struct } from './util.js';
export declare namespace Fetch {
    /**
     * Context arrives as a second argument, never a closure.
     *
     * Deliberately the shape of `ProxyHandler` in `@pingid/lib-proxy`, for the reason its
     * `ProxyContext` doc gives: a route is built once at startup and applied many times, so
     * anything captured in its closure is frozen for the life of the process. Being
     * shape-compatible also lets a route serve as the fallback of a proxy chain with no adapter
     * in between. A shared convention, not a dependency — nothing here imports proxy.
     *
     * The conditional is what makes a forgotten context a compile error rather than a silent
     * `undefined` reaching the handler.
     */
    type Handler<D extends Struct = {}> = {} extends D ? (request: Request, context?: D) => Promise<Response> : (request: Request, context: D) => Promise<Response>;
    type Ctx<T> = T extends Route<any, any, any, any, infer D> ? D : {};
}
/** One route as a standalone handler. Anything it does not match is a 404. */
export declare const toFetch: <I extends Struct, O, C extends Struct, P extends string, D extends Struct>(route: Route<I, O, C, P, D>) => Fetch.Handler<D>;
/** Several routes, tried in order. Their context requirements intersect, as `Api.group` does. */
export declare const router: <const R extends readonly Route.Node[]>(...routes: R) => Fetch.Handler<Compute<Intersect<Fetch.Ctx<R[number]>>>>;
