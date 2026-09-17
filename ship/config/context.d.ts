import { Config, ConfigStack } from './index.js';
import { Spec } from '../resource.js';
export type Cx = {
    config: Config;
    cwd: string;
    temp?: string;
};
export declare const createContext: (config: Config) => Cx;
/** The spec a stack declares, or the path it points at. */
export declare const resolveSpec: (stack: ConfigStack) => Promise<Spec | string>;
/** A file docker can read: a path stack as-is, anything else written to scratch. */
export declare const resolvePath: (ctx: Cx, stack: ConfigStack) => Promise<string>;
export type ShellOptions = {
    bin: string;
    env: Record<string, string | undefined>;
    args: string[];
};
export declare const execute: (ctx: Cx, config: ShellOptions) => Promise<number>;
export declare const cleanScratch: (ctx: Cx) => void;
