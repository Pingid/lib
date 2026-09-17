import type * as D from './types.cjs';
export interface Def {
    service: D.DefinitionsService;
    network: D.DefinitionsNetwork;
    volume: D.DefinitionsVolume;
    secret: D.DefinitionsSecret;
    config: D.DefinitionsConfig;
}
type DefInit<T, C> = T | ((c: C) => T) | ((c: C) => Promise<T>);
export type Context<N extends string> = {
    name: N;
    build?: boolean;
};
declare const RESOURCE: unique symbol;
export interface ResourceDef<K extends keyof Def = keyof Def, N extends string = any, T extends Def[K] = Def[K]> {
    [RESOURCE]: true;
    type: K;
    name: N;
    init: (cx: Context<N>) => Promise<T>;
}
export declare const Service: <N extends string, const T extends D.DefinitionsService>(name: N, def: DefInit<T, Context<N>>) => ResourceDef<"service", N, T>;
export type Service<N extends string = string, T extends Def['service'] = Def['service']> = ResourceDef<'service', N, T>;
export declare const Network: <N extends string, const T extends D.DefinitionsNetwork>(name: N, def: DefInit<T, Context<N>>) => ResourceDef<"network", N, T>;
export type Network<N extends string = string, T extends Def['network'] = Def['network']> = ResourceDef<'network', N, T>;
export declare const Volume: <N extends string, const T extends D.DefinitionsVolume>(name: N, def: DefInit<T, Context<N>>) => ResourceDef<"volume", N, T>;
export type Volume<N extends string = string, T extends Def['volume'] = Def['volume']> = ResourceDef<'volume', N, T>;
export declare const Secret: <N extends string, const T extends D.DefinitionsSecret>(name: N, def: DefInit<T, Context<N>>) => ResourceDef<"secret", N, T>;
export type Secret<N extends string = string, T extends Def['secret'] = Def['secret']> = ResourceDef<'secret', N, T>;
export declare const Config: <N extends string, const T extends D.DefinitionsConfig>(name: N, def: DefInit<T, Context<N>>) => ResourceDef<"config", N, T>;
export type Config<N extends string = string, T extends Def['config'] = Def['config']> = ResourceDef<'config', N, T>;
declare const COMPOSE: unique symbol;
export type Compose<T extends ResourceDef<keyof Def, any, any>, N extends string = string> = {
    name: N;
    [COMPOSE]: true;
    resources: T[];
} & Mapped<T>;
export declare const Compose: <T extends (ResourceDef<keyof Def, any, any> | Compose<any>)[]>(name: string, resources: T | (() => T)) => Compose<Extract<T[number], ResourceDef>>;
type Mapped<T extends ResourceDef> = {
    [K in T['type']]: {
        [N in T['name']]: T;
    };
};
export type Var<T extends any = any, N extends string = string> = {
    name: N;
    $infer: T;
    provide: (value: T) => void;
    get: () => T;
};
export declare const Var: <T, N extends string = string>(name: N) => Var<T, N>;
export declare const Resolve: <T extends Compose<any>>(c: T, cx: {
    build?: boolean;
}) => Promise<any>;
export {};
