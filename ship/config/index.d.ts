import { Spec } from '../resource.js';
export interface CliConfig {
    bin?: string;
    env?: Record<string, string>;
    defaultArgs?: string[];
    argv?: string[];
    stacks: Record<string, Spec | (() => Promise<Spec>) | Promise<Spec>>;
}
export declare const define: (config: CliConfig) => CliConfig;
export declare const cli: (config: CliConfig) => void;
