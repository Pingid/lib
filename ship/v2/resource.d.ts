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
/** Brands are `Symbol.for` keys so a second copy of this module (jiti, bundlers) still agrees. */
declare const RESOURCE: unique symbol;
declare const COMPOSE: unique symbol;
/** What a definition function is called with. */
export interface Context<N extends string = string> {
    /** This resource's key — its DNS name for a service, its map key otherwise. */
    readonly name: N;
}
export type Init<K extends Kind, N extends string> = Def[K] | ((cx: Context<N>) => Def[K] | Promise<Def[K]>);
/**
 * One compose resource: a key and its definition.
 *
 * The definition is not generic over its own shape, so a literal is checked against the
 * compose schema directly and a misspelt field is an error rather than an inferred type.
 */
export interface Resource<K extends Kind = Kind, N extends string = string> {
    readonly [RESOURCE]: true;
    readonly type: K;
    readonly name: N;
    /** Stored against a plain `Context`: the literal key only matters inside the function. */
    readonly def: Init<K, string>;
}
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
/** Anything a compose file lists: a resource, or another compose file to include whole. */
export type Item = Resource | Compose<any>;
/** The resources an item contributes. */
type Local<I> = I extends Compose<infer R> ? R : I extends Resource ? I : never;
/** Keyed by name when the resources are known; any name when this is just `Compose`. */
type Group<R extends Resource, K extends Kind> = Resource extends R ? {
    readonly [name: string]: Resource<K>;
} : {
    readonly [P in Extract<R, Resource<K>> as P['name']]: P;
};
type Groups<R extends Resource> = {
    readonly [K in Kind as `${K}s`]: Group<R, K>;
};
/** A compose file: its project name, its resources, and those resources grouped by kind. */
export type Compose<R extends Resource = Resource, N extends string = string> = Groups<R> & {
    readonly [COMPOSE]: true;
    readonly name: N;
    /** Every resource, with included compose files flattened in. */
    readonly items: readonly Resource[];
};
export declare const Compose: <const N extends string, const I extends readonly Item[]>(name: N, items: I) => Compose<Local<I[number]>, N>;
/** A compose file. `name` is the project name, which the generated types predate. */
export type Spec = D.ComposeSpecification & {
    name: string;
};
/** Evaluate every definition into a plain compose file — `JSON.stringify` it and it is valid YAML. */
export declare const Resolve: (compose: Compose) => Promise<Spec>;
export {};
