import { Compute, ParametersOf, ReplyHandlers, RequestParams, ResponseTypes, RouteParamsSchemaFor, RouteSpec } from './types.cjs';
import { AdapterOptions } from './context/index.cjs';
import { Schema } from '../../core/index.cjs';
export * from './types.cjs';
export declare const Spec: {
    <const P extends string, S extends Spec<P>>(path: P, params: S): Compute<{
        path: P;
    } & S>;
};
export type Spec<P extends string> = ParametersOf<P> extends string ? Omit<RouteSpec, 'path' | 'params'> & {
    params: RouteParamsSchemaFor<P>;
} : RouteSpec;
export declare const Route: {
    <const I extends RouteSpec, C = {}>(schema: I, handler: RouteHandler<I, C>): Route<I, C, Request>;
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
