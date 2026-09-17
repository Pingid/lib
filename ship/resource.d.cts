import { Context, ContextValue } from './context.cjs';
import type * as D from './types.cjs';
export interface Definitions {
    service: D.DefinitionsService;
    network: D.DefinitionsNetwork;
    volume: D.DefinitionsVolume;
    secret: D.DefinitionsSecret;
    config: D.DefinitionsConfig;
}
export type ResourceType = keyof Definitions;
/** Resource types that carry a `name` field and can therefore be shared across stacks. */
export type ShareableType = Exclude<ResourceType, 'service'>;
export declare const RESOURCE_TYPES: readonly ["service", "network", "volume", "secret", "config"];
export type AnyResource = Resource<ResourceType, any, any, any>;
/** Anything `compose()` or `stack()` accepts. */
export type Item = ContextValue<any> | AnyResource;
/**
 * Structural view of a `Stack`, declared here so `Ctx` can reference one without
 * `resource.ts` importing `stack.ts`.
 */
export interface StackRef {
    readonly name: string;
    readonly items: readonly Item[];
}
export interface Use {
    <T>(ref: Context<T>): T;
    <T extends ResourceType, N extends string, O>(ref: Resource<T, N, O, any>): O;
}
export interface Ref {
    <T extends ShareableType, N extends string>(stack: StackRef, ref: Resource<T, N, any, any>): {
        name: N;
    };
}
export interface Ctx<N extends string, O> {
    /** This resource's key — its DNS name for services, its map key otherwise. */
    readonly name: N;
    /** This resource's own out handle, for self-reference. */
    readonly out: O;
    /** Pull in a context value, or a resource in this same stack (registering it if needed). */
    readonly use: Use;
    /** Reference a `.shared()` resource belonging to another stack; emits an `external` stub here. */
    readonly ref: Ref;
}
export type Init<S, C> = (c: C) => S | Promise<S>;
/**
 * A single compose resource.
 *
 * Builder methods are pure — each returns a new `Resource`. The object you pass to
 * `compose()` / `stack()` / `use()` is the identity used for deduplication, so always
 * pass the end of the chain.
 */
export declare class Resource<T extends ResourceType, N extends string, O = {
    name: N;
}, S = undefined> {
    static service<const N extends string>(name: N): Resource<'service', N>;
    static network<const N extends string>(name: N): Resource<'network', N>;
    static volume<const N extends string>(name: N): Resource<'volume', N>;
    static secret<const N extends string>(name: N): Resource<'secret', N>;
    static config<const N extends string>(name: N): Resource<'config', N>;
    readonly type: T;
    protected _name: N;
    protected _out: O;
    protected _spec: Init<unknown, Ctx<N, O>>;
    protected _shared: string | undefined;
    constructor(type: T, name: N);
    /** @internal */
    static meta(r: AnyResource): {
        type: ResourceType;
        name: string;
        spec: Init<unknown, Ctx<string, any>>;
        shared: string | undefined;
    };
    /** @internal The value `use()` hands back: the declared out, plus the resource key. */
    static handle(r: AnyResource): Record<string, unknown>;
    protected derive(patch: {
        out?: unknown;
        spec?: unknown;
        shared?: string;
    }): any;
    /** Define the resource body. Call `.out()` first if the body needs to read its own handle. */
    spec<S2 extends Definitions[T]>(spec: Init<S2, Ctx<N, O>>): Resource<T, N, O, S2>;
    /** Declare extra fields other resources see through `use()`. Always includes `name`. */
    out<const O2 extends Record<string, unknown>>(out: O2): Resource<T, N, O2 & {
        name: N;
    }, S>;
    /** Layer an override on top of the existing body — environment overlays without forking. */
    patch(f: (def: S, c: Ctx<N, O>) => S | Promise<S>): Resource<T, N, O, S>;
    /**
     * Pin this resource's docker object name so other stacks can reference it.
     *
     * Compose prefixes the project name onto network/volume names, so a shared object must
     * pin `name:` explicitly or the `external` reference in the consuming stack cannot be
     * reconstructed reliably. Services cannot be shared this way — they have no `name` field.
     */
    shared(this: Resource<ShareableType, N, O, S>, dockerName?: string): Resource<T, N, O, S>;
}
