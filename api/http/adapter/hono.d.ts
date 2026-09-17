import { Hono, Context, Handler, TypedResponse } from 'hono';
import { HonoBase } from 'hono/hono-base';
import { MergePath, ToSchema } from 'hono/types';
import { StatusCode } from 'hono/utils/http-status';
import { AnyRoutable, Inputs, Intersect, Method, Responses, Routable, Spec } from './shared.js';
/**
 * Mount routes on a Hono app, typed as if each went through `app.on`.
 *
 * Returns the app, so a group nests like any sub-app. Pass an app to add middleware, an env or a base path.
 *
 * @example
 * const items = honoRoutes([getItem, createItem])
 * const app = new Hono().route('/api', items)
 * hc<typeof app>('/').api.items[':id'].$get({ param: { id: '1' } })
 */
export declare const honoRoutes: <const R extends readonly AnyRoutable[], A extends HonoBase<any, any, any, any> = Hono>(routes: R, app?: A, context?: (c: Context) => unknown) => WithHonoRoutes<A, R>;
/** Read off `HonoBase`: `basePath()` returns it rather than `Hono`, and only it carries the base path. */
export type WithHonoRoutes<A, R extends readonly AnyRoutable[]> = A extends HonoBase<infer E, infer S, infer B, infer P> ? HonoBase<E, S & Intersect<Schema<R[number]['spec'], B>>, B, P> : never;
type Schema<I, B extends string> = I extends Spec ? ToSchema<Method<I>, MergePath<B, I['path']>, {
    in: In<I>;
    out: In<I>;
}, Merged<Out<I>>> : never;
/** Hono's internal `MergeTypedResponse`, as `app.on` applies it to a handler's resolved return. */
type Merged<T> = [T] extends [TypedResponse] ? T : TypedResponse;
/**
 * A route as the arguments `app.on` takes, so method and path come from the spec.
 *
 * Context defaults to `c.var`; pass `context` to build it from the Hono context instead.
 *
 * @example
 * const app = new Hono().on(...honoRoute(getItem))
 * hc<typeof app>('/').items[':id'].$get({ param: { id: '1' } })
 */
export declare const honoRoute: <const I extends Spec, C = {}>(rt: Routable<I, C>, context?: (c: Context) => C) => HonoOnArgs<I>;
export type HonoOnArgs<I extends Spec> = readonly [
    method: Method<I>,
    path: I['path'],
    handler: Handler<any, any, {
        in: In<I>;
        out: In<I>;
    }, Promise<Out<I>>>
];
/** Hono's names for the request parts: `param` for path params, `json` for the body. */
export type In<I extends Spec> = {
    [K in keyof Inputs<I> as Rename[K & keyof Rename]]: Inputs<I>[K];
};
type Rename = {
    params: 'param';
    query: 'query';
    body: 'json';
};
export type Out<I extends Spec> = [Responses<I>] extends [never] ? Response : Typed<Responses<I>>;
type Typed<R> = R extends {
    status: infer S extends StatusCode;
    format: infer F extends string;
    data: infer D;
} ? TypedResponse<D, S, F> : never;
export {};
