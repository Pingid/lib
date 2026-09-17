import { Config } from './index.js';
/** Run `ship [stack] <command> [args...]`, resolving to the exit code. */
export declare const run: (config: Config) => Promise<number>;
/** Usage, with the stacks this config declares. */
export declare const help: (config: Config) => string;
