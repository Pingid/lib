import { Arg } from '../arg.cjs';
import { Cmd } from '../cmd.cjs';
export declare namespace Parse {
    interface Route {
        cmd: Cmd.Node;
        argv: string[];
    }
    interface Result {
        cmd: Cmd.Node;
        /** Values for the command's own args. */
        input: Record<string, unknown>;
        /** Values for inherited options — these are merged into the handler's context. */
        context: Record<string, unknown>;
        help: boolean;
        version: boolean;
    }
}
/**
 * Walk subcommands off the front of `argv`.
 *
 * Global options are allowed to appear before the subcommand — `app --use-stderr group
 * op1` — since they can be resolved by name against this node's ancestors and its whole
 * subtree. They are lifted out and handed to the leaf's parse, which is the only place
 * that knows whether the option actually applies. Any other flag stops the walk, so an
 * unknown one is reported against the node that would own it.
 */
export declare const route: (root: Cmd.Node, argv: string[]) => Parse.Route;
/** What `route` accepts ahead of a subcommand: an option from here up, or from anywhere below. */
export declare const global: (cmd: Cmd.Node, name: string) => Arg.Any | undefined;
/**
 * Turn the remaining argv into the command's input.
 *
 * `--flag value` · `--flag=value` · `--no-flag` · `-abc` · `-n5` · `-n=5` · `--`
 *
 * Repeated flags append when the arg is an array; otherwise the last one wins.
 */
export declare const parse: (cmd: Cmd.Node, argv: string[]) => Parse.Result;
export declare const Parse: {
    route: (root: Cmd.Node, argv: string[]) => Parse.Route;
    parse: (cmd: Cmd.Node, argv: string[]) => Parse.Result;
    global: (cmd: Cmd.Node, name: string) => Arg.Any | undefined;
};
