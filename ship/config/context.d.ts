import { Config, ConfigStack } from './index.js';
export type Cx = {
    config: Config;
    temp: string;
};
export declare const createContext: (config: Config) => Cx;
export declare const resolvePath: (ctx: Cx, stack: ConfigStack) => Promise<string>;
export type ShellOptions = {
    bin: string;
    env: Record<string, string | undefined>;
    args: string[];
};
export declare const execute: (ctx: Cx, config: ShellOptions) => Promise<number>;
export declare const cleanScratch: (ctx: Cx) => void;
