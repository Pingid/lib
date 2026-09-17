import { Spec } from './registry.cjs';
export type Config = Record<string, Spec> | Spec;
export declare function defineConfig<const T extends Record<string, Spec>>(config: T): T;
export declare function defineConfig<const T extends Record<string, Spec>>(config: () => T): T;
export declare function defineConfig<const T extends Record<string, Spec>>(config: () => Promise<T>): Promise<T>;
export declare function defineConfig<const T extends Spec>(config: T): T;
export declare function defineConfig<const T extends Spec>(config: () => T): T;
export declare function defineConfig<const T extends Spec>(config: () => Promise<T>): Promise<T>;
