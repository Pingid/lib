import { Schema } from '../../core/index.js';
import { Cmd } from '../cmd.js';
export declare namespace CliError {
    type Code = 'unknown-option' | 'unknown-command' | 'missing-command' | 'missing-value' | 'missing-argument' | 'unexpected-argument' | 'invalid-value';
    interface Options {
        code?: Code;
        cmd?: Cmd.Node;
        exit?: number;
    }
}
/**
 * A failure caused by the invocation rather than the handler. These are reported
 * as `error: <message>` plus a usage hint; anything else propagates untouched.
 */
export declare class CliError extends Error {
    readonly code: CliError.Code;
    readonly exit: number;
    /** Attached by whoever has it — an `Arg` decoding a token does not know its command. */
    cmd: Cmd.Node | undefined;
    constructor(message: string, options?: CliError.Options);
    /** Fills in the command if it is not already known. Returns itself, to rethrow. */
    at(cmd: Cmd.Node): this;
    /** One line per path, outermost only — nested failures repeat the same root cause. */
    static fromIssues(issues: Schema.Issue[], cmd?: Cmd.Node): CliError;
}
