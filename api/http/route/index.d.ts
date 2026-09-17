import { BodyProtocol, Compute, ParametersOf, ReplyHandlers, RequestParams, ResponseTypes, RouteParamsSchemaFor, RouteSpec, RouteSpecResponse } from './types.js';
import { AdapterOptions } from './context/index.js';
import { Injected, Injects } from './inject.js';
import { Schema } from '../../core/index.js';
import { OperationObject } from 'openapi-typescript';
export * from './types.js';
export * from './inject.js';
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
export declare const Handler: {
    <I extends RouteSpec>(handler: RouteHandler<I>): RouteHandler<I>;
};
export type RouteHandler<I extends RouteSpec, C = {}> = (ctx: RouteHandlerContext<I> & ReplyHandlers<ResponseTypes<I>>, context: C) => Response | Promise<Response>;
export interface RouteHandlerContext<I extends RouteSpec> {
    request: Request;
    spec: I;
    params: RequestParams<I>;
}
/** Create a route request handler for a route */
export declare const adapt: <R extends Request, C = undefined, I extends RouteSpec = RouteSpec>(rt: {
    spec: I;
    handler: RouteHandler<I, C>;
}, e?: AdapterOptions<R, I["body"] | I["query"] | I["params"], C>) => Route<I, C, R>;
export declare const adapter: <R extends Request, C = undefined, S extends Schema.Type = Schema.Type>(e: AdapterOptions<R, S, C>) => <I extends RouteSpec>(rt: {
    spec: I;
    handler: RouteHandler<I, C>;
}) => (req: R) => Promise<Response>;
export declare const PrefixSpecs: <P extends string, const I extends RouteSpec[]>(prefix: P, ...routes: I) => { [K in keyof I]: PrefixSpec<P, I[K]>; };
type PrefixSpec<P extends string, T extends RouteSpec> = Compute<Omit<T, 'path'> & {
    path: `${P}${T['path']}`;
}>;
export declare const Prefix: <P extends string, const I extends Route<any, any, any>[]>(prefix: P, ...routes: I) => { [K in keyof I]: PrefixRoute<P, I[K]>; };
type PrefixRoute<P extends string, T extends Route<any, any, any>> = T extends Route<any, infer H, infer R> ? Route<PrefixSpec<P, T['spec']>, H, R> : never;
