import { Schema } from '../../core/index.js';
import * as Route from '../route/index.js';
/** A route with a path, as frameworks need one to mount it. */
export type Spec = Route.RouteSpec & {
    path: string;
};
export interface Routable<I extends Route.RouteSpec, C> {
    schema: I;
    handler: Route.RouteHandler<I, C>;
}
/** Any mountable route. Structural, since `Routable` is contravariant in its spec through `handler`. */
export type AnyRoutable = {
    schema: Spec;
    handler: (ctx: any, context: any) => unknown;
};
/** Request parts as the host framework parsed them. Thunks, so a part the route does not declare is never read. */
export interface Parts<F> {
    params: () => unknown;
    query: () => unknown;
    body: () => unknown;
    framework: F;
}
/**
 * Run a route against framework-parsed parts instead of re-reading the `Request`.
 *
 * Parts are keyed by request in a `WeakMap`, so the core still receives the framework's own `Request`
 * untouched.
 */
export declare const serve: <F, C>(rt: Routable<any, C>, context: (framework: F) => C) => (req: Request, p: Parts<F>) => Promise<Response>;
export type Intersect<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export type Method<I extends Route.RouteSpec> = I['method'] extends string ? I['method'] : 'GET';
/** The request parts a route declares a schema for, as validated values. */
export type Inputs<I extends Route.RouteSpec> = Route.Compute<(I['params'] extends Schema.Type ? {
    params: Schema.Output<I['params']>;
} : {}) & (I['query'] extends Schema.Type ? {
    query: Schema.Output<I['query']>;
} : {}) & (I['body'] extends Schema.Type ? {
    body: Schema.Output<I['body']>;
} : {})>;
/** One entry per declared status and content type. Everything but JSON is text on the wire. */
export type Responses<I extends Route.RouteSpec, N = Route.NormalizedRouteResponseSchema<I['response']>> = {
    [S in keyof N]: {
        [T in keyof N[S]]: T extends 'application/json' ? {
            status: S;
            json: true;
            data: Schema.Output<N[S][T]>;
        } : {
            status: S;
            json: false;
            data: string;
        };
    }[keyof N[S]];
}[keyof N];
