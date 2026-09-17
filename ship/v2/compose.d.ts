import { Kind, Resource } from './resource.js';
declare const COMPOSE: unique symbol;
declare const REF: unique symbol;
/**
 * A resource seen from outside the stack that owns it.
 *
 * Listing one in another stack emits an `external` stub there, and makes the owner come up
 * first. `name` is the key the stub is emitted under, so it can be used as-is.
 */
export interface Ref<K extends Kind = Kind, N extends string = string> {
    readonly [REF]: true;
    readonly type: K;
    readonly name: N;
    readonly stack: Compose;
    readonly resource: Resource<K, N>;
}
export declare const isRef: (value: unknown) => value is Ref;
/** Anything a stack lists: its own resources, refs into other stacks, or a whole stack to include. */
export type Item = Resource | Ref | Compose<any>;
/** The resources an item contributes to the stack that lists it. */
type Local<I> = I extends Compose<infer R> ? R : I extends Resource ? I : never;
/** Keyed by name when the resources are known; any name when this is just `Compose`. */
type Group<R extends Resource, K extends Kind> = Resource extends R ? {
    readonly [name: string]: Ref<K>;
} : {
    readonly [P in Extract<R, Resource<K>> as P['name']]: Ref<K, P['name']>;
};
type Groups<R extends Resource> = {
    readonly [K in Kind as `${K}s`]: Group<R, K>;
};
/**
 * A named set of resources: one compose file, one docker project.
 *
 * `stack.networks.edge` is a `Ref` — the way another stack reaches this one's resources.
 */
export type Compose<R extends Resource = Resource, N extends string = string> = Groups<R> & {
    readonly [COMPOSE]: true;
    readonly name: N;
    /** Every entry, with included stacks flattened in. Refs are kept as refs. */
    readonly items: readonly (Resource | Ref)[];
};
export declare const isCompose: (value: unknown) => value is Compose;
/**
 * The list may be a thunk, so a stack can ref into one declared after it. It is read once, on
 * first access.
 */
export declare const Compose: <const N extends string, const I extends readonly Item[]>(name: N, items: I | (() => I)) => Compose<Local<I[number]>, N>;
export {};
