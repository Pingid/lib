import { Env, Handler, TypedResponse } from 'hono';
import { Route } from './route.js';
import { Struct } from './util.js';
export declare namespace Hono {
    /** Hono's names for the same four sources. `json` is its key for a validated body. */
    type Parts<I, S> = Route.Present<{
        param: Route.Part<I, S, 'path'>;
        query: Route.Part<I, S, 'query'>;
        header: Route.Part<I, S, 'header'>;
        json: Route.Part<I, S, 'body'>;
    }>;
    /**
     * What `hc` reads to type a request.
     *
     * Asserted rather than produced by a validator middleware, and backed by `Schema.validate`
     * at runtime. That is exactly what `hono/validator` does — `TypedResponse` is likewise a
     * phantom over a plain `Response` — so this is the same kind of claim, made against our own
     * validation instead of someone else's.
     */
    type In<I, S> = {
        in: Parts<I, S>;
        out: Parts<I, S>;
    };
}
/**
 * One route as a single Hono handler.
 *
 * Deliberately *not* a spread of `[validator, validator, handler]`. Hono's `.get` is an
 * overload ladder — two handlers, three, four, then a variadic catch-all — that threads `I`,
 * `I2`, `I3` so validator outputs accumulate into the `ToSchema` that `hc` reads. A spread
 * type-checks, but if resolution falls through to the variadic rung the app still compiles and
 * the route still serves while `hc` silently loses its typed request arguments. One handler
 * with `I` declared keeps that inference in a single, stable position.
 *
 * No validator package either: `@hono/typebox-validator` is TypeBox-only and
 * `@hono/standard-validator` is standard-schema-only, while `Schema` is both — and
 * `Schema.validate`'s TypeBox path runs `Convert → Check → Decode`, so skipping it would
 * change what the handler receives.
 */
export declare const hono: <I extends Struct, O, C extends Struct, P extends string, D extends Struct, S>(route: Route<I, O, C, P, D, S>) => Handler<Env, P, Hono.In<I, S>, Promise<TypedResponse<O, 200, "json">>>;
