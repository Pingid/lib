import type * as D from './types.cjs';
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
/** Type-only: carries a compose file's context requirement. Nothing sets it at runtime. */
declare const CONTEXT: unique symbol;
/**
 * One compose resource: a key, and a function from the context it needs to its definition.
 *
 * `def` is a method so it is bivariant: a resource needing `{ image: string }` is still a
 * `Resource`, and the context it needs can still be inferred from it.
 */
export interface Resource<K extends Kind = Kind, N extends string = string, S extends Def[K] = Def[K], C extends Record<string, unknown> = Record<string, unknown>> {
    readonly [RESOURCE]: true;
    readonly type: K;
    readonly name: N;
    def(cx: C, name: N): S | Promise<S>;
}
export declare const Service: <const N extends string, C extends Record<string, unknown> = {}, S extends D.DefinitionsService = D.DefinitionsService>(name: N, def: (cx: C, name: N) => S | Promise<S>) => Resource<"service", N, S, C>;
export type Service<N extends string = string, S extends Def['service'] = Def['service'], C extends Record<string, unknown> = Record<string, unknown>> = Resource<'service', N, S, C>;
export declare const Network: <const N extends string, C extends Record<string, unknown> = {}, S extends D.DefinitionsNetwork = D.DefinitionsNetwork>(name: N, def: (cx: C, name: N) => S | Promise<S>) => Resource<"network", N, S, C>;
export type Network<N extends string = string, S extends Def['network'] = Def['network'], C extends Record<string, unknown> = Record<string, unknown>> = Resource<'network', N, S, C>;
export declare const Volume: <const N extends string, C extends Record<string, unknown> = {}, S extends D.DefinitionsVolume = D.DefinitionsVolume>(name: N, def: (cx: C, name: N) => S | Promise<S>) => Resource<"volume", N, S, C>;
export type Volume<N extends string = string, S extends Def['volume'] = Def['volume'], C extends Record<string, unknown> = Record<string, unknown>> = Resource<'volume', N, S, C>;
export declare const Secret: <const N extends string, C extends Record<string, unknown> = {}, S extends D.DefinitionsSecret = D.DefinitionsSecret>(name: N, def: (cx: C, name: N) => S | Promise<S>) => Resource<"secret", N, S, C>;
export type Secret<N extends string = string, S extends Def['secret'] = Def['secret'], C extends Record<string, unknown> = Record<string, unknown>> = Resource<'secret', N, S, C>;
export declare const Config: <const N extends string, C extends Record<string, unknown> = {}, S extends D.DefinitionsConfig = D.DefinitionsConfig>(name: N, def: (cx: C, name: N) => S | Promise<S>) => Resource<"config", N, S, C>;
export type Config<N extends string = string, S extends Def['config'] = Def['config'], C extends Record<string, unknown> = Record<string, unknown>> = Resource<'config', N, S, C>;
/** Anything a compose file lists: a resource, or another compose file to include whole. */
export type Item = Resource<Kind, any, any, any> | Compose<any, any, any>;
/** The resources an item contributes. */
type Local<I> = I extends Compose<infer R, any, any> ? R : I extends Resource<any, any, any, any> ? I : never;
/** Keyed by name when the resources are known; any name when this is just `Compose`. */
type Group<R extends Resource, K extends Kind> = Resource extends R ? {
    readonly [name: string]: Resource<K>;
} : {
    readonly [P in Extract<R, {
        type: K;
    }> as P['name']]: P;
};
type Groups<R extends Resource> = {
    readonly [K in Kind as `${K}s`]: Group<R, K>;
};
/** A compose file: its project name, its resources, and those resources grouped by kind. */
export type Compose<R extends Resource = Resource, N extends string = string, C = {}> = Groups<R> & {
    readonly [COMPOSE]: true;
    readonly name: N;
    /** Every resource, with included compose files flattened in. */
    readonly items: readonly Resource[];
    /** A method, like `Resource.def`, so a compose file needing context is still a `Compose`. */
    [CONTEXT]?(cx: C): void;
};
type ContextOf<I> = I extends Item ? I extends Resource<any, any, any, infer C> ? C : I extends Compose<any, any, infer C> ? C : never : never;
type Cx<I> = Compute<Intersect<ContextOf<I>>>;
export declare const Compose: <const N extends string, const I extends readonly Item[]>(name: N, items: I) => Compose<Local<I[number]>, N, Cx<I[number]>>;
type Intersect<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type Compute<T> = {
    [K in keyof T]: T[K];
} & {};
/** A compose file. `name` is the project name, which the generated types predate. */
export type Spec = D.ComposeSpecification & {
    name: string;
};
/** Evaluate every definition into a plain compose file — `JSON.stringify` it and it is valid YAML. */
export declare const Resolve: <C>(compose: Compose<any, any, C>, cx: C) => Promise<Spec>;
export {};
