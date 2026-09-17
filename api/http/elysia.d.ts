import { TSchema as ElysiaTSchema } from 'elysia';
import { Route } from './route.js';
import { Compute, Struct } from './util.js';
export declare namespace Elysia {
    /**
     * A schema carrying its static type.
     *
     * Extends **elysia's** re-exported `TSchema`, not the one this package imports.
     * `@sinclair/typebox` ships two declaration builds behind conditional exports, each
     * declaring `Kind` as its own `unique symbol`; under `nodenext` elysia's CJS `.d.ts` reads
     * `build/cjs` while this ESM package reads `build/esm`, so the two `TSchema` types are
     * nominally distinct and even a plain `Type.Object(...)` from here is not assignable to
     * elysia's `AnySchema`. Sourcing the base type from elysia keeps the whole hook object
     * inside the type universe it is handed to, and is why this module imports no typebox.
     *
     * `core/schema.ts` erases the schema type on the way in, so `static` is the only way Eden
     * Treaty can be told what a route accepts and returns.
     */
    interface TypedSchema<O> extends ElysiaTSchema {
        type: 'object';
        static: O;
    }
    /**
     * The request parts this route actually uses.
     *
     * A source the route does not bind is dropped. It has to be: elysia types an unvalidated
     * `body` as `unknown`, and `unknown` is not assignable to the `{}` an empty `Pick` produces,
     * so declaring every part would fail every GET.
     */
    type Parts<I, S> = Route.Present<{
        params: Route.Part<I, S, 'path'>;
        query: Route.Part<I, S, 'query'>;
        headers: Route.Part<I, S, 'header'>;
        body: Route.Part<I, S, 'body'>;
    }>;
    type Hooks<I, S, O> = Compute<{
        [K in keyof Parts<I, S>]: TypedSchema<Parts<I, S>[K]>;
    } & {
        response: {
            200: TypedSchema<O>;
        };
    }>;
    /**
     * Only what the handler reads.
     *
     * Under `strictFunctionTypes` a handler parameter is contravariant, so elysia's much fatter
     * `Context` is assignable to this — and declaring `D` here is what makes a missing
     * `.decorate` an error at the `.get()` call, against the app that would have to supply it,
     * rather than an error inside this module.
     */
    type Ctx<I, S, D extends Struct> = Compute<Parts<I, S> & D & {
        set: {
            status?: number | string;
        };
    }>;
    /** Exactly the arguments `Elysia.get` takes, so `app.get(...elysia(r))` is an ordinary call. */
    type Args<P extends string, I, S, O, D extends Struct> = readonly [
        path: P,
        handler: (context: Ctx<I, S, D>) => Promise<O>,
        hooks: Hooks<I, S, O>
    ];
}
/**
 * One route as the three arguments elysia's `.get`/`.post`/… already take.
 *
 * Spread rather than wrapped: elysia builds its accumulated `Routes` type — which is what Eden
 * Treaty reads — out of exactly those three argument types, so anything that changes the shape
 * of the call has to reconstruct that accumulation by hand. A plugin to `.use()` would also
 * force a runtime import of elysia into this module, and scope its context locally, which is
 * the opposite of what per-route context needs.
 *
 * The return must stay a *tuple* type; declared as an array, every literal is lost at once.
 */
export declare const elysia: <I extends Struct, O, C extends Struct, P extends string, D extends Struct, S>(route: Route<I, O, C, P, D, S>) => Elysia.Args<P, I, S, O, D>;
