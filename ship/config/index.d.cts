import { Spec } from '../resource.cjs';
export interface Config {
    bin?: string;
    /** Additional environment variables */
    env?: Record<string, string>;
    /** Default arguments to pass to the command */
    defaultArgs?: string[];
    /** Program arguments */
    argv?: string[];
    /** Default stack when not named */
    default?: string;
    /** Docker compose stacks */
    stacks: Record<string, Stack>;
}
type Stack = Spec | (() => Promise<Spec>) | Promise<Spec> | string;
export declare const define: (config: Config) => Config;
export declare const cli: (config: Config) => Promise<number>;
export {};
