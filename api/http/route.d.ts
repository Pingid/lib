import { Schema } from '../core/index.js';
import { Compute, Struct } from './util.js';
import * as Path from './path.js';
export type Node = Type<any, any, any, any, any, any>;
export type Source = 'path' | 'query' | 'header' | 'cookie' | 'body' | 'raw';
export type Verb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type Rest = 'query' | 'header' | 'cookie' | 'body';
/**
 * The shape an `Api` node already has, read structurally — so nothing here imports `Api`.
 * The contract `Cmd.Like` uses, for the same reason.
 */
export interface Like<I extends Struct = any, O = any, C extends Struct = any> {
    name: string;
    description?: string | undefined;
    in?: Schema.Type<I> | undefined;
    out?: Schema.Type<O> | undefined;
    handle?: ((input: I, context: C) => O | Promise<O>) | undefined;
}
export type In<M> = M extends Like<infer I, any, any> ? I : never;
export type Out<M> = M extends Like<any, infer O, any> ? Awaited<O> : never;
export type Context<M> = M extends Like<any, any, infer C> ? C : never;
/** Input keys a source claims, or a map from input key to the name on the wire. */
export type Claim = readonly string[] | Readonly<Record<string, string>>;
/**
 * How one method is exposed. Field order is claim priority, and each field is narrowed to
 * what the ones above it left — so claiming a key twice is unrepresentable.
 *
 * @example
 * ```ts
 * { method: 'GET', path: '/orgs/:org', query: ['page'], header: { requestId: 'x-request-id' } }
 * { method: 'POST', path: '/orgs/:org/repos', body: true }
 * ```
 */
export interface Spec {
    method?: Verb;
    path?: string;
    query?: Claim;
    header?: Claim;
    cookie?: Claim;
    raw?: Claim;
    body?: Claim | true;
    /** Where whatever no source claimed belongs. Silences the unbound-key error. */
    rest?: Rest;
}
/** One resolved key: where it comes from, and under what name. */
export interface Binding {
    source: Source;
    /** The wire name. Defaults to the key, or to `kebab(key)` for a header. */
    name: string;
    /** Set when the fragment says `array`, so repeated values collect instead of overwriting. */
    array: boolean;
}
export type Bindings = Record<string, Binding>;
/** A field of `S`, or `never` when absent — safer than `S['query']` on a generic. */
export type At<S, K extends PropertyKey> = S extends {
    readonly [P in K]: infer V;
} ? V : never;
/** The input keys a claim names, in either spelling. */
export type Listed<C> = C extends readonly string[] ? C[number] : C extends Readonly<Record<string, string>> ? Extract<keyof C, string> : never;
export type Params<S> = Path.Keys<At<S, 'path'> & string>;
/** Keys still up for grabs once `Taken` is claimed. */
export type Free<I, Taken> = Exclude<Extract<keyof I, string>, Taken>;
/** Either spelling of a claim, restricted to `K`. */
export type Only<K extends string> = readonly K[] | {
    readonly [P in K]?: string;
};
export type Claimed<S> = Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>> | Listed<At<S, 'cookie'>> | Listed<At<S, 'raw'>>;
/**
 * Each source narrowed to the keys the ones above it left — editor completions, not a build
 * failure. A violated *optional* property is not reliably reported, so every check that does
 * fail a build is spelled as a required property: `Errors`, `Conflicts`, `Strays`.
 */
export interface Check<I extends Struct, S> {
    query?: Only<Free<I, Params<S>>>;
    header?: Only<Free<I, Params<S> | Listed<At<S, 'query'>>>>;
    cookie?: Only<Free<I, Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>>>>;
    raw?: Only<Free<I, Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>> | Listed<At<S, 'cookie'>>>>;
    body?: Only<Free<I, Claimed<S>>> | true;
}
/**
 * Where keys no source claimed end up: `rest`, or `body` when `body: true`.
 *
 * Use sites read `[Src] extends [Sweep<S>]`, never the reverse — with no sweep this is
 * `never`, which extends everything and would land the remainder in every source at once.
 */
export type Sweep<S> = [At<S, 'rest'>] extends [never] ? [true] extends [At<S, 'body'>] ? 'body' : never : At<S, 'rest'>;
export type Unclaimed<I, S> = Free<I, Claimed<S> | Listed<At<S, 'body'>>>;
/** The input keys one source supplies, explicit claims plus the sweep when it lands here. */
export type Keys<I, S, Src extends Source> = (Src extends 'path' ? Extract<Params<S>, keyof I> : never) | (Src extends 'query' ? Listed<At<S, 'query'>> : never) | (Src extends 'header' ? Listed<At<S, 'header'>> : never) | (Src extends 'cookie' ? Listed<At<S, 'cookie'>> : never) | (Src extends 'body' ? Listed<At<S, 'body'>> : never) | ([Src] extends [Sweep<S>] ? Unclaimed<I, S> : never);
/** One source's share of the flat input, as the object a framework validates. */
export type Part<I, S, Src extends Source> = Compute<Pick<I, Extract<Keys<I, S, Src>, keyof I>>>;
/**
 * Drops the sources a route does not use, so a GET declares no `body`. Emptiness is `keyof`:
 * `{} extends T[K]` is true of any all-optional object, and would drop an optional query.
 */
export type Present<T> = {
    [K in keyof T as [keyof T[K]] extends [never] ? never : K]: T[K];
};
/** A path that is not a literal disables both checks rather than reporting every key. */
export type Loose<S> = string extends At<S, 'path'> & string ? true : false;
/**
 * Keys no source claimed.
 *
 * Both opt-outs read `[true] extends [At<S, …>]`. The natural direction is *true* when the
 * field is absent — absent is `never`, which extends everything — silently disabling the
 * check for every spec without a body. Bracketing stops distribution, not that.
 */
export type Unbound<I, S> = Loose<S> extends true ? never : [At<S, 'rest'>] extends [never] ? [true] extends [At<S, 'body'>] ? never : Free<I, Claimed<S> | Listed<At<S, 'body'>>> : never;
export type Stray<I, S> = Loose<S> extends true ? never : Exclude<Params<S>, Extract<keyof I, string>>;
/**
 * Keys more than one source claims, over the same cascade `Check` narrows by. Computed here
 * rather than left to `Check` because only a *required* property fails a build.
 *
 * @example
 * ```ts
 * Route.of(getRepo, { path: '/orgs/:org', query: ['page'], header: ['page'] })
 * // Property "'page' is claimed by more than one source" is missing
 * ```
 */
export type Duplicated<S> = Extract<Listed<At<S, 'query'>>, Params<S>> | Extract<Listed<At<S, 'header'>>, Params<S> | Listed<At<S, 'query'>>> | Extract<Listed<At<S, 'cookie'>>, Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>>> | Extract<Listed<At<S, 'raw'>>, Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>> | Listed<At<S, 'cookie'>>> | Extract<Listed<At<S, 'body'>>, Claimed<S>>;
/**
 * Unbound keys, as required properties the caller cannot supply — the compiler prints a
 * missing property's name verbatim, so the name *is* the message. `never` for a complete
 * spec, so a correct route pays nothing. Keys are precomputed because a mapped type whose
 * key depends on `S` is circular once `S` appears in its own constraint.
 *
 * @example
 * ```ts
 * Route.of(getRepo, { method: 'GET', path: '/orgs/:org' })
 * // Property "bind 'page' to a source, or set rest" is missing
 * ```
 */
export type Errors<I extends Struct, S> = {
    [M in `bind '${Unbound<I, S>}' to a source, or set rest`]: Source;
};
/** Each kept to one message template: two in a single mapped key resolves as circular. */
export type Conflicts<S> = {
    [M in `'${Duplicated<S>}' is claimed by more than one source`]: Source;
};
export type Strays<I, S> = {
    [M in `path declares ':${Stray<I, S>}', which the input has no key for`]: Source;
};
/**
 * One method, exposed over HTTP: the binding table and nothing framework-specific.
 *
 * @example
 * ```ts
 * const get = Route.of(getRepo, { method: 'GET', path: '/orgs/:org', query: ['page'] })
 * get.bindings['org'] // { source: 'path', name: 'org', array: false }
 * get.match('/orgs/acme') // { org: 'acme' }
 * ```
 */
export declare class Type<I extends Struct = any, O = any, C extends Struct = {}, P extends string = string, D extends Struct = {}, S = Spec> {
    node: Like<I, O, C>;
    method: Verb;
    path: P;
    bindings: Bindings;
    rest: Rest | undefined;
    /** The input schema as JSON, read once — every fragment lookup goes through it. */
    json: Schema.Json;
    private compiled;
    /** Process-lifetime context, supplied by `with`. */
    context: Partial<C>;
    /** Per-request context, supplied by `from`. */
    supply: ((framework: any) => C | Promise<C>) | undefined;
    /** `S` sits in the return position: as a parameter it would make the class invariant in it. */
    readonly _types?: (input: I, context: C, framework: D) => [O, S];
    constructor(node: Like<I, O, C>, spec: Spec);
    /** The JSON Schema fragment for one input key, which is what decides coercion. */
    fragment(key: string): Schema.Json | undefined;
    match(pathname: string): Record<string, string> | undefined;
    keys(source: Source): Record<string, string>;
    /**
     * Values known at build time — a pool, a client. Captured is correct for these.
     *
     * @example
     * ```ts
     * Route.of(getRepo, spec).with({ db })
     * ```
     */
    with(context: C): this;
    /**
     * Per-request context, read off the framework's own. `D` comes from the callback's parameter
     * annotation and lands on the adapter's handler type, so a missing decoration is reported by
     * the framework at the mount site rather than here.
     *
     * @example
     * ```ts
     * Route.of(getRepo, spec).from((c: { var: { db: Db } }) => ({ db: c.var.db }))
     * ```
     */
    from<const D2 extends Struct>(supply: (framework: D2) => C | Promise<C>): Type<I, O, C, P, Compute<D & D2>, S>;
    /**
     * Declares what the framework must provide, without supplying it. Mirrors `Cmd.context`.
     *
     * @example
     * ```ts
     * const needy = Route.of(getRepo, spec).needs<{ tenant: string }>()
     * new App().get(...Elysia.route(needy)) // error: 'tenant' is missing
     * new App().decorate('tenant', 'acme').get(...Elysia.route(needy)) // ok
     * ```
     */
    needs<T extends Struct>(): Type<I, O, C, P, Compute<D & T>, S>;
}
/**
 * Expose a method over HTTP.
 *
 * Every enforced check arrives as a required property the caller cannot supply; `Check` is
 * intersected only for completions. They stay out of `S`'s own constraint, which a mapped
 * type keyed on `S` would make circular.
 *
 * @example
 * ```ts
 * const get = Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['page'] })
 * const create = Route.of(createRepo, { method: 'POST', path: '/orgs/:org/repos', body: true })
 * ```
 */
export declare const of: <I extends Struct, O, C extends Struct, const S extends Spec>(node: Like<I, O, C>, spec: S & Check<I, S> & Errors<I, S> & Conflicts<S> & Strays<I, S>) => Type<I, Awaited<O>, C, At<S, "path"> & string extends never ? string : At<S, "path"> & string, {}, S>;
