import { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
export type MaybePromise<T> = T | Promise<T>;
/** Undoes whatever `start` set up. Runs once, when the dev server closes. */
export type Cleanup = () => MaybePromise<void>;
export interface DevCtx {
    config: ResolvedConfig;
    server: ViteDevServer;
    /** Re-run `cb` whenever `file` changes. Relative paths resolve against vite root. */
    watch: (file: string, cb: (file: string) => MaybePromise<void>) => void;
}
export interface BuildCtx {
    config: ResolvedConfig;
}
export type Lifecycle = (c: DevCtx) => MaybePromise<Cleanup | void>;
export type Trigger = (c: BuildCtx) => MaybePromise<void>;
export interface Hooks {
    /** Suffix for the plugin name and log prefix, e.g. `openapi`. */
    name?: string;
    /** Runs once per dev server. Anything it returns is called on close. */
    start?: Lifecycle;
    /** Runs once per `vite build`, before the bundle. */
    build: Trigger;
}
/**
 * Runs side effects — codegen, a child process, a watcher — alongside vite.
 *
 * `start` owns the dev server's lifetime and `build` owns a one-shot build,
 * which is the only difference between the two modes worth writing twice.
 */
export declare const lifecycle: (hooks: Hooks) => Plugin;
