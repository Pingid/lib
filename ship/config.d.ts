import { Context } from './context.js';
import { Spec } from './registry.js';
type Multi = Record<string, Spec> & {
    $provide?: Context[];
};
type Single = Spec & {
    $provide?: Context[];
};
export type Config = Multi | Single;
export declare function defineConfig<const T extends Multi>(config: T): T;
export declare function defineConfig<const T extends Multi>(config: () => T): T;
export declare function defineConfig<const T extends Multi>(config: () => Promise<T>): Promise<T>;
export declare function defineConfig<const T extends Single>(config: T): T;
export declare function defineConfig<const T extends Single>(config: () => T): T;
export declare function defineConfig<const T extends Single>(config: () => Promise<T>): Promise<T>;
export {};
