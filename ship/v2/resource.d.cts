import type * as D from './types.cjs';
export interface Definitions {
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
export interface ResourceDef {
    type: keyof Definitions;
    name: string;
    init: () => Promise<any>;
}
export declare const Service: <N extends string, const T extends D.DefinitionsService>(name: N, def: DefInit<T, Context<N>>) => {
    type: "service";
    name: N;
    init: () => Promise<T>;
};
export declare const Network: <N extends string, const T extends D.DefinitionsNetwork>(name: N, def: DefInit<T, Context<N>>) => {
    type: "network";
    name: N;
    init: () => Promise<T>;
};
export declare const Volume: <N extends string, const T extends D.DefinitionsVolume>(name: N, def: DefInit<T, Context<N>>) => {
    type: "volume";
    name: N;
    init: () => Promise<T>;
};
export declare const Secret: <N extends string, const T extends D.DefinitionsSecret>(name: N, def: DefInit<T, Context<N>>) => {
    type: "secret";
    name: N;
    init: () => Promise<T>;
};
export declare const Config: <N extends string, const T extends D.DefinitionsConfig>(name: N, def: DefInit<T, Context<N>>) => {
    type: "config";
    name: N;
    init: () => Promise<T>;
};
export declare const Var: <T>(name: string) => {
    name: string;
    provide: (value: T) => Map<string, any>;
    get: () => any;
};
export {};
