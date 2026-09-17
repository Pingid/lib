import { Meta, Compute, ParametersOf, ReplyHandlers, RequestParams, ResponseTypes, RouteParamsSchemaFor, RouteSpec, RouteSpecResponse } from './types.js';
import { AdapterOptions } from './context/index.js';
import { Schema } from '../../core/index.js';
export * from './types.js';
export declare const Spec: {
    <const P extends string, S extends Spec<P>>(path: P, params: S): Compute<{
        path: P;
    } & S>;
};
export type Spec<P extends string> = [ParametersOf<P>] extends [never] ? Omit<RouteSpec, 'path'> : Omit<RouteSpec, 'path' | 'params'> & {
    params: RouteParamsSchemaFor<P>;
};
export declare const Route: {
    <const I extends RouteSpec, C = {}>(schema: I, handler: RouteHandler<I, C>): Route<I, C, Request>;
    /**
     * The handler inside the spec as `handle`.
     *
     * Each part has its own type parameter: a lone `S` would get no inference from an object holding an
     * unannotated `handle`, since TypeScript defers the function and skips the whole literal.
     */
    <const P extends string, const M extends Method | undefined = undefined, Pa extends RouteParamsSchemaFor<P> | undefined = undefined, Q extends Schema.Type.Object | undefined = undefined, B extends Schema.Type | undefined = undefined, const Res extends RouteSpecResponse = undefined, C = {}>(path: P, spec: Meta & {
        method?: M;
        params?: Pa;
        query?: Q;
        body?: B;
        response?: Res;
        handle: RouteHandler<Defined<P, M, Pa, Q, B, Res>, C>;
    }): Route<Defined<P, M, Pa, Q, B, Res>, C, Request>;
};
type Method = NonNullable<RouteSpec['method']>;
export type Defined<P, M, Pa, Q, B, Res> = {
    path: P;
    method: M;
    params: Pa;
    query: Q;
    body: B;
    response: Res;
};
export interface Route<I extends RouteSpec = RouteSpec, C = any, R extends Request = Request> {
    schema: I;
    handler: RouteHandler<I, C>;
    fetch: (r: R) => Promise<Response>;
}
export declare const Handler: {
    <I extends RouteSpec>(handler: RouteHandler<I>): RouteHandler<I>;
};
export type RouteHandler<I extends RouteSpec, C = {}> = (ctx: RouteHandlerContext<I, C> & ReplyHandlers<ResponseTypes<I>>) => Response | Promise<Response>;
export interface RouteHandlerContext<I extends RouteSpec, C = unknown> {
    request: Request;
    spec: I;
    params: RequestParams<I>;
    context: C;
}
/** Create a route request handler for a route */
export declare const adapt: <R extends Request, C = undefined, I extends RouteSpec = RouteSpec>(rt: {
    schema: I;
    handler: RouteHandler<I, C>;
}, e?: AdapterOptions<R, I["body"] | I["query"] | I["params"], C>) => Route<I, C, R>;
export declare const adapter: <R extends Request, C = undefined, S extends Schema.Type = Schema.Type>(e: AdapterOptions<R, S, C>) => <I extends RouteSpec>(rt: {
    schema: I;
    handler: RouteHandler<I, C>;
}) => (req: R) => Promise<Response>;
