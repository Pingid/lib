import { TSchema as ElysiaTSchema } from 'elysia';
import { Compute, Struct } from './util.cjs';
import type * as Route from './route.cjs';
/**
 * A schema carrying its static type — the only way to tell Eden what a route accepts and
 * returns, since `Schema.Type` erases the schema type on the way in.
 *
 * Built on **elysia's** `TSchema`, not ours: `@sinclair/typebox` ships two declaration builds
 * behind conditional exports, each with its own `unique symbol` `Kind`, and under `nodenext`
 * elysia's CJS `.d.ts` reads one while this ESM package reads the other. Even a plain
 * `Type.Object(…)` from here is not assignable to elysia's `AnySchema`, which is why this
 * module imports no typebox at all.
 */
export interface TypedSchema<O> extends ElysiaTSchema {
    type: 'object';
    static: O;
}
/**
 * The request parts this route actually uses. An unbound source has to be dropped: elysia
 * types an unvalidated `body` as `unknown`, which is not assignable to the `{}` an empty
 * `Pick` gives, so declaring every part would fail every GET.
 */
export type Parts<I, S> = Route.Present<{
    params: Route.Part<I, S, 'path'>;
    query: Route.Part<I, S, 'query'>;
    headers: Route.Part<I, S, 'header'>;
    body: Route.Part<I, S, 'body'>;
}>;
export type Hooks<I, S, O> = Compute<{
    [K in keyof Parts<I, S>]: TypedSchema<Parts<I, S>[K]>;
} & {
    response: {
        200: TypedSchema<O>;
    };
}>;
/**
 * Only what the handler reads. A handler parameter is contravariant, so elysia's much fatter
 * `Context` is assignable to it — and naming `D` here is what reports a missing `.decorate`
 * at the `.get()` call, against the app that would have to supply it.
 */
export type Ctx<I, S, D extends Struct> = Compute<Parts<I, S> & D & {
    set: {
        status?: number | string;
    };
}>;
/** Exactly the arguments `get` takes, so `app.get(...elysia(r))` is an ordinary call. */
export type Args<P extends string, I, S, O, D extends Struct> = readonly [
    path: P,
    handler: (context: Ctx<I, S, D>) => Promise<O>,
    hooks: Hooks<I, S, O>
];
/**
 * One route as the three arguments elysia's `.get`/`.post`/… already take.
 *
 * Spread rather than wrapped, because elysia builds the `Routes` type Eden reads out of
 * exactly those argument types. The return must stay a *tuple*; as an array every literal is
 * lost at once.
 *
 * @example
 * ```ts
 * import { Elysia as App } from 'elysia'
 * import * as Elysia from '@pingid/lib-api/http/elysia'
 *
 * const app = new App().decorate('db', db).get(...Elysia.route(get))
 * treaty<typeof app>('localhost').orgs({ org: 'a' }).get({ query: { page: 2 } })
 * ```
 */
export declare const route: <I extends Struct, O, C extends Struct, P extends string, D extends Struct, S>(route: Route.Type<I, O, C, P, D, S>) => Args<P, I, S, O, D>;
