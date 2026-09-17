import { BodyProtocol, Compute, ParametersOf, ReplyHandlers, RequestParams, ResponseTypes, RouteParamsSchemaFor, RouteSpec, RouteSpecResponse } from './types.js';
import { AdapterOptions } from './context/index.js';
import { Injected, Injects } from './inject.js';
import { OperationObject } from 'openapi-typescript';
import { Schema } from '../../core/index.js';
export * from './types.js';
export * from './inject.js';
/**
 * A route's contract without its handler, for sharing between server, client and docs.
 * `params` is required, and checked against the path, whenever the path has `:params`.
 *
 * @example
 * const getItem = Spec('/items/:id', {
 *   method: 'GET',
 *   params: Type.Object({ id: Type.String() }),
 *   response: { 200: { 'application/json': Item }, 404: { 'text/plain': Type.String() } },
 * })
 * const GetItem = Route(getItem, (c) => c.json(items.get(c.params.path.id)))
 */
export declare const Spec: {
    <const P extends string, S extends Spec<P>>(path: P, params: S): Compute<{
        path: P;
    } & S>;
};
export type Spec<P extends string> = [ParametersOf<P>] extends [never] ? Omit<RouteSpec, 'path'> : Omit<RouteSpec, 'path' | 'params'> & {
    params: RouteParamsSchemaFor<P>;
};
export interface Route<I extends RouteSpec = RouteSpec, C = any, R extends Request = Request> {
    spec: I;
    handler: RouteHandler<I, C>;
    /** The providers the handler receives, kept for introspection. Already applied by `handler`. */
    inject?: Injects;
    fetch: (r: R) => Promise<Response>;
}
/**
 * A route: a spec plus its handler, with a `fetch` that validates and answers on its own.
 *
 * @example
 * const Update = Route('/apps/:slug', {
 *   method: 'PUT',
 *   params: Type.Object({ slug: Type.String() }),
 *   body: App,
 *   response: Type.Object({ id: Type.String() }),
 *   inject: { user, apps },
 *   handle: async (c, { user, apps }) => c.json(await apps.put(c.params.path.slug, user)),
 * })
 */
export declare const Route: {
    <const I extends RouteSpec, C = {}>(schema: I, handler: RouteHandler<I, C>): Route<I, C, Request>;
    /**
     * The handler inside the spec as `handle`.
     *
     * Each part has its own type parameter: a lone `S` would get no inference from an object holding an
     * unannotated `handle`, since TypeScript defers the function and skips the whole literal.
     *
     * `inject` names the providers the handler receives in its context, resolved per request:
     * `inject: { user }` gives `handle: (c, { user }) => ...`.
     */
    <const P extends string, const M extends Method | undefined = undefined, Pa extends RouteParamsSchemaFor<P> | undefined = undefined, Q extends Schema.Type.Object | undefined = undefined, B extends Schema.Type | BodyProtocol | undefined = undefined, const Res extends RouteSpecResponse = undefined, D extends Injects = {}, C = {}>(path: P, spec: OperationObject & {
        method?: M;
        params?: Pa;
        query?: Q;
        body?: B;
        response?: Res;
        inject?: D;
        handle: RouteHandler<Defined<P, M, Pa, Q, B, Res>, WithInjected<C, D>>;
    }): Route<Compute<Defined<P, M, Pa, Q, B, Res>>, C, Request>;
};
/** The route's own context plus what it injects. Left alone without `inject`, so `C` infers from an annotation. */
type WithInjected<C, D> = [keyof D] extends [never] ? C : C & Injected<D>;
/**
 * A handler that receives its injected values, as a handler that does not. The route's context type then
 * only names what the host must supply, so adapters mount it unchanged.
 */
export declare const bind: <I extends RouteSpec, C, D extends Injects>(inject: D, handle: RouteHandler<I, C & Injected<D>>) => RouteHandler<I, C>;
type Method = NonNullable<RouteSpec['method']>;
export type Defined<P, M, Pa, Q, B, Res> = {
    path: P;
    method: M;
    params: Pa;
    query: Q;
    body: B;
    response: Res;
};
/**
 * Type a handler against a spec before it has a route, e.g. to define it in another file.
 *
 * @example
 * const handleGetItem = Handler<typeof getItem>((c) => c.json(items.get(c.params.path.id)))
 * const GetItem = Route(getItem, handleGetItem)
 */
export declare const Handler: {
    <I extends RouteSpec>(handler: RouteHandler<I>): RouteHandler<I>;
};
export type RouteHandler<I extends RouteSpec, C = {}> = (ctx: RouteHandlerContext<I> & ReplyHandlers<ResponseTypes<I>>, context: C) => Response | Promise<Response>;
export interface RouteHandlerContext<I extends RouteSpec> {
    request: Request;
    spec: I;
    params: RequestParams<I>;
}
/**
 * Give a route its outside context, or custom extractors, and get back a route whose `fetch` needs nothing more.
 *
 * @example
 * const Me = adapt(Route(meSpec, (c, cx: { user: string }) => c.json({ user: cx.user })), {
 *   context: (req) => ({ user: req.headers.get('x-user')! }),
 * })
 * await Me.fetch(new Request('http://localhost/me'))
 */
export declare const adapt: <R extends Request, C = undefined, I extends RouteSpec = RouteSpec>(rt: {
    spec: I;
    handler: RouteHandler<I, C>;
}, e?: AdapterOptions<R, I["body"] | I["query"] | I["params"], C>) => Route<I, C, R>;
export declare const adapter: <R extends Request, C = undefined, S extends Schema.Type = Schema.Type>(e: AdapterOptions<R, S, C>) => <I extends RouteSpec>(rt: {
    spec: I;
    handler: RouteHandler<I, C>;
}) => (req: R) => Promise<Response>;
/**
 * Prepend `prefix` to every spec's path, keeping the literal path types.
 *
 * @example
 * const [list, get] = PrefixSpecs('/v1', listItems, getItem) // paths '/v1/items', '/v1/items/:id'
 */
export declare const PrefixSpecs: <P extends string, const I extends RouteSpec[]>(prefix: P, ...routes: I) => { [K in keyof I]: PrefixSpec<P, I[K]>; };
type PrefixSpec<P extends string, T extends RouteSpec> = Compute<Omit<T, 'path'> & {
    path: `${P}${T['path']}`;
}>;
/**
 * Prepend `prefix` to every route's path. Inside a `Router`, prefer its `prefix` option.
 *
 * @example
 * const v1 = Prefix('/v1', List, Update)
 */
export declare const Prefix: <P extends string, const I extends Route<any, any, any>[]>(prefix: P, ...routes: I) => { [K in keyof I]: PrefixRoute<P, I[K]>; };
type PrefixRoute<P extends string, T extends Route<any, any, any>> = T extends Route<any, infer H, infer R> ? Route<PrefixSpec<P, T['spec']>, H, R> : never;
