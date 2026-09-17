import { Spec } from '../resource.cjs';
export { run, help } from './run.cjs';
export interface Config {
    bin?: string;
    /** Additional environment variables */
    env?: Record<string, string>;
    /** Default arguments to pass to the command */
    defaultArgs?: string[];
    /** Program arguments */
    argv?: string[];
    /** Directory relative paths in a stack resolve against (default: the config file's directory) */
    cwd?: string;
    /** Default stack when not named */
    default?: string;
    /** Docker compose stacks */
    stacks: Record<string, ConfigStack>;
}
/** A compose file: resolved, still resolving, resolved on demand, or a path to one on disk. */
export type ConfigStack = Spec | Promise<Spec> | (() => Spec | Promise<Spec>) | string;
export declare const define: (config: Config) => Config;
