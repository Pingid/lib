export type ShellOptions = {
    /** Working directory of the child. Defaults to the parent's. */
    cwd?: string;
    /** Extra variables, merged over `process.env`. `undefined` unsets one. */
    env?: Record<string, string | undefined>;
    /** Written to the child's stdin, which is then closed. Forces stdin to a pipe. */
    input?: string;
    /**
     * Where the child's streams go. `pipe` (the default) captures them; `inherit` hands it
     * the parent's, so output streams to the terminal as it is produced and an interactive
     * command can read the keyboard. Nothing is captured when inherited.
     */
    stdio?: 'pipe' | 'inherit';
    /** Kill the child with `signal` after this many milliseconds. */
    timeout?: number;
    /** Signal used by `timeout`. Defaults to `SIGTERM`. */
    signal?: NodeJS.Signals;
};
export type ShellResult = {
    cmd: string;
    args: string[];
    /** Captured stdout, empty when the stream was inherited. */
    stdout: string;
    /** Captured stderr, empty when the stream was inherited. */
    stderr: string;
    /** Exit status, or `null` when the child was killed by a signal. */
    code: number | null;
    /** The signal that killed the child, if any. */
    signal: NodeJS.Signals | null;
};
/**
 * A command that ran and failed. The whole {@link ShellResult} is attached as `result`,
 * because callers routinely need the exit code or the output that came before the failure.
 *
 * Deliberately has no `code` of its own: a command that could not be started at all rejects
 * with Node's spawn error instead, whose `code` is a string such as `'ENOENT'`. Keeping the
 * exit status under `result.code` keeps the two failures distinguishable.
 */
export declare class ShellError extends Error {
    readonly result: ShellResult;
    constructor(result: ShellResult);
}
export declare const runSpawned: (cmd: string, args: string[], options?: ShellOptions) => Promise<ShellResult>;
/**
 * The call shapes every command runner accepts:
 *
 * - `sh('git', ['status'], { cwd })` — explicit command and arguments.
 * - ``sh`git commit -m ${msg}` `` — a template; see {@link parse_template} for how it splits.
 * - `sh({ cwd })` — returns the same runner with those options applied to every call.
 *
 * @internal Exported only because the runners' public types name it.
 */
export interface ShellMacro<R> {
    (cmd: string, args?: string[], options?: ShellOptions): Promise<R>;
    (t: TemplateStringsArray, ...args: unknown[]): Promise<R>;
    (options: ShellOptions): ShellMacro<R>;
}
export declare const ShellMacro: <R>(cb: Runner<R>) => ShellMacro<R>;
type Runner<R> = (cmd: string, args: string[], options: ShellOptions) => Promise<R>;
export {};
