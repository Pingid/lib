import { ShellMacro, ShellResult } from './core.cjs';
export type { ShellOptions, ShellResult, ShellMacro } from './core.cjs';
export { ShellError } from './core.cjs';
/**
 * Run a command and resolve with its result whatever the exit status. Rejects only when
 * the child could not be started at all, so a non-zero exit stays inspectable — the shape
 * commands like `git diff --quiet` need, where the status *is* the answer.
 */
export declare const run: ShellMacro<ShellResult>;
/** Run a command, throwing a {@link ShellError} unless it exits zero. */
export declare const sh: ShellMacro<ShellResult>;
/** Run a command and return its trimmed stdout, throwing unless it exits zero. */
export declare const sho: ShellMacro<string>;
/** Run a command and report only whether it succeeded. Never throws for a failed command. */
export declare const ok: ShellMacro<boolean>;
/**
 * {@link sh} on the parent's streams, so output appears as it is produced and the command
 * can prompt for input. The result carries the status but no output. For the other runners
 * on inherited streams, pass the option: `Shell.run({ stdio: 'inherit' })`.
 */
export declare const io: ShellMacro<ShellResult>;
