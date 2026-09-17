import type * as D from './types.js';
/** The compose definition each resource kind produces. */
export interface Def {
    service: D.DefinitionsService;
    network: D.DefinitionsNetwork;
    volume: D.DefinitionsVolume;
    secret: D.DefinitionsSecret;
    config: D.DefinitionsConfig;
}
export type Kind = keyof Def;
/** Compose's own top-level order, so generated files diff cleanly. */
export declare const KINDS: readonly ["service", "network", "volume", "secret", "config"];
/**
 * Brands are `Symbol.for` keys rather than classes: the CLI loads configs through jiti, which
 * can hand a config its own copy of this module, and a process-global symbol is the same in
 * every copy where a class identity would not be.
 */
declare const RESOURCE: unique symbol;
declare const VAR: unique symbol;
/** What a definition function is called with. */
export interface Context<N extends string = string> {
    /** This resource's key — its DNS name for a service, its map key otherwise. */
    readonly name: N;
    /** The stack (docker project) being resolved. */
    readonly project: string;
    /** Whether the file is being written out, rather than run. */
    readonly build: boolean;
    /** Read a `Var`: the value provided at resolve time, else its fallback. */
    get<T>(v: Var<T>): T;
}
export type Init<K extends Kind, N extends string> = Def[K] | ((cx: Context<N>) => Def[K] | Promise<Def[K]>);
/**
 * One compose resource: plain data, keyed by identity.
 *
 * The definition is not generic over its own shape, so a literal gets checked against the
 * compose schema directly and a misspelt field is an error rather than an inferred type.
 */
export interface Resource<K extends Kind = Kind, N extends string = string> {
    readonly [RESOURCE]: true;
    readonly type: K;
    readonly name: N;
    /** Stored against a plain `Context`: the literal key only matters inside the function. */
    readonly def: Init<K, string>;
}
export declare const isResource: (value: unknown) => value is Resource;
export declare const Service: <const N extends string>(name: N, def?: Init<"service", N>) => Resource<"service", N>;
export type Service<N extends string = string> = Resource<'service', N>;
export declare const Network: <const N extends string>(name: N, def?: Init<"network", N>) => Resource<"network", N>;
export type Network<N extends string = string> = Resource<'network', N>;
export declare const Volume: <const N extends string>(name: N, def?: Init<"volume", N>) => Resource<"volume", N>;
export type Volume<N extends string = string> = Resource<'volume', N>;
export declare const Secret: <const N extends string>(name: N, def?: Init<"secret", N>) => Resource<"secret", N>;
export type Secret<N extends string = string> = Resource<'secret', N>;
export declare const Config: <const N extends string>(name: N, def?: Init<"config", N>) => Resource<"config", N>;
export type Config<N extends string = string> = Resource<'config', N>;
/** A typed value supplied per resolve, rather than held in module state. */
export interface Var<T = unknown, N extends string = string> {
    readonly [VAR]: true;
    readonly name: N;
    readonly fallback: {
        value: T;
    } | undefined;
    /** Bind a value, to pass to `Resolve` / `Project` as one of `vars`. */
    provide(value: T): Binding<T>;
}
export interface Binding<T = unknown> {
    readonly var: Var<T>;
    readonly value: T;
}
export declare function Var<T, const N extends string = string>(name: N, ...fallback: [] | [T]): Var<T, N>;
export {};
