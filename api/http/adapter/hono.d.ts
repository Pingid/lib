import { Context, Handler, TypedResponse } from 'hono';
import { StatusCode } from 'hono/utils/http-status';
import { Inputs, Method, Responses, Routable, Spec } from './shared.js';
/**
 * A route as the arguments `app.on` takes, so method and path come from the spec.
 *
 * Context defaults to `c.var`; pass `context` to build it from the Hono context instead.
 *
 * @example
 * const app = new Hono().on(...honoRoute(getContainer))
 * hc<typeof app>('/').containers[':id'].$get({ param: { id: '1' } })
 */
export declare const honoRoute: <const I extends Spec, C = {}>(rt: Routable<I, C>, context?: (c: Context) => C) => Args<I>;
export type Args<I extends Spec> = readonly [
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
    json: infer J;
    data: infer D;
} ? TypedResponse<D, S, J extends true ? 'json' : 'text'> : never;
export {};
