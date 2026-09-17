import { ContextValue } from './context.js';
import { Spec } from './registry.js';
type Multi = Record<string, Spec> & {
    $provide?: ContextValue[];
};
type Single = Spec & {
    $provide?: ContextValue[];
};
export type Config = Multi | Single;
export declare function defineConfig<const T extends Multi>(config: () => Promise<T>): Promise<T>;
export declare function defineConfig<const T extends Multi>(config: () => T): T;
export declare function defineConfig<const T extends Multi>(config: T): T;
export declare function defineConfig<const T extends Single>(config: () => Promise<T>): Promise<T>;
export declare function defineConfig<const T extends Single>(config: () => T): T;
export declare function defineConfig<const T extends Single>(config: T): T;
export {};
