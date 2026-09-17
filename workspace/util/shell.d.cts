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
 * A command that ran and failed. The whole {@link ShellResult} is attached, because
 * callers routinely need the exit code or the output that came before the failure.
 */
export declare class ShellError extends Error {
    readonly result: ShellResult;
    constructor(result: ShellResult);
    get code(): number | null;
    get stdout(): string;
    get stderr(): string;
}
export interface ShellMacro<O, R> {
    (cmd: string, args: string[], o: O): Promise<R>;
    (t: TemplateStringsArray, ...args: any[]): Promise<R>;
    (opts: O): ShellMacro<O, R>;
}
export declare class Shell {
    /**
     * Run a command and resolve with its result whatever the exit status. Rejects only when
     * the child could not be started at all, so a non-zero exit stays inspectable — the shape
     * commands like `git diff --quiet` need, where the status *is* the answer.
     */
    static run: (cmd: string, args: string[], options?: ShellOptions) => Promise<ShellResult>;
    /** Run a command, throwing a {@link ShellError} unless it exits zero. */
    static sh: ShellMacro<ShellOptions | undefined, ShellResult>;
    /** Run a command and return its trimmed stdout, throwing unless it exits zero. */
    static sho: (cmd: string, args: string[], options?: ShellOptions) => Promise<string>;
    /**
     * Run a command on the parent's streams, so its output appears as it is produced and it
     * can prompt for input. Throws a {@link ShellError} unless it exits zero; the result
     * carries the status but no output, since nothing was captured.
     */
    static io: ShellMacro<ShellOptions | undefined, ShellResult>;
    /** Run a command and report only whether it succeeded. Never throws for a failed command. */
    static ok: ShellMacro<ShellOptions | undefined, boolean>;
}
