import type * as D from './types.js';
interface Definitions {
    service: D.DefinitionsService;
    network: D.DefinitionsNetwork;
    volume: D.DefinitionsVolume;
    secret: D.DefinitionsSecret;
    config: D.DefinitionsConfig;
}
type ResourceType = keyof Definitions;
type Ctx<N extends string, O> = {
    name: N;
    out: O;
    use: <T>(r: Context<T> | Resource<ResourceType, any, T, any>) => T;
};
type Init<D, C = any> = (c: C) => D | Promise<D>;
type Scope = Map<Context | Resource<ResourceType, string, any, any>, any>;
export declare const compose: (...r: (ContextValue<any> | Resource<ResourceType, any, any, any>)[]) => Promise<Record<string, Record<string, any>>>;
export declare class Resource<T extends ResourceType, N extends string, O = {
    name: N;
}, S = undefined> {
    static service<N extends string>(name: N): Resource<"service", N, {
        name: N;
    }, undefined>;
    static network<N extends string>(name: N): Resource<"network", N, {
        name: N;
    }, undefined>;
    static volume<N extends string>(name: N): Resource<"volume", N, {
        name: N;
    }, undefined>;
    static secret<N extends string>(name: N): Resource<"secret", N, {
        name: N;
    }, undefined>;
    static config<N extends string>(name: N): Resource<"config", N, {
        name: N;
    }, undefined>;
    readonly type: T;
    protected _name: N;
    protected _out: O;
    protected _spec: (_: Ctx<N, O>) => null;
    constructor(type: T, name: N);
    spec<const D extends Definitions[T]>(spec: Init<D, Ctx<N, O>>): Resource<T, N, O, D>;
    out<const O extends Record<string, any>>(out: O): Resource<T, N, O & {
        name: N;
    }, S>;
}
export declare class Context<T = any> {
    static define<T>(): Context<T>;
    private constructor();
    create(value: T): ContextValue<T>;
}
declare class ContextValue<T = any> {
    private value;
    private ref;
    constructor(c: Context<T>, value: T);
    store(s: Scope): void;
}
export {};
