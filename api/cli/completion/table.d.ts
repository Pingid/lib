import { Arg } from '../arg.js';
import { Cmd } from '../cmd.js';
export declare namespace Table {
    type Item = Arg.Item;
    /** `Arg.Complete` flattened to something a script can carry. A function becomes `call`. */
    type Spec = Arg.Source | 'call' | readonly string[];
    interface Options {
        /** Offer `--version` at the root. Set when the CLI was configured with one. */
        version?: boolean | undefined;
    }
    /** @example { names: ['--env', '-e'], takes: true, spec: ['dev', 'prod'] } */
    interface Flag {
        /** The long form first, then one entry per alias. */
        names: string[];
        description?: string | undefined;
        /** Consumes a following token. False for booleans. */
        takes: boolean;
        spec?: Spec | undefined;
    }
    /**
     * One command path's baked answers.
     *
     * @example { path: ['deploy'], commands: [], flags: [...], positionals: [['dev', 'prod']] }
     */
    interface Entry {
        /** The subcommand chain below the root, in kebab form. Empty at the root. */
        path: string[];
        commands: Item[];
        flags: Flag[];
        /** Per positional slot, in `cmd.positional()` order. Truncated at the variadic. */
        positionals: (Spec | undefined)[];
        /** The last slot soaks up every remaining token, so it never advances past it. */
        variadic: boolean;
        /** Spellings `find` accepts besides the canonical kebab, paired with it. */
        aliases: [spelling: string, canonical: string][];
    }
}
/**
 * Flatten the tree into one entry per reachable command path.
 *
 * @example of(root).map((entry) => entry.path.join(' ')) // ['', 'deploy', 'deploy api']
 */
export declare const of: (root: Cmd.Node, options?: Table.Options) => Table.Entry[];
/** One command's own answers. Exported so `resolve` builds candidates the same way. */
export declare const entry: (cmd: Cmd.Node, path: string[], version: boolean) => Table.Entry;
export declare const flags: (cmd: Cmd.Node, version: boolean) => Table.Flag[];
/** An override on the declaring command wins, so a global can be set once at the root. */
export declare const spec: (cmd: Cmd.Node, arg: Arg.Any) => Arg.Complete | undefined;
export declare const Table: {
    of: (root: Cmd.Node, options?: Table.Options) => Table.Entry[];
    entry: (cmd: Cmd.Node, path: string[], version: boolean) => Table.Entry;
    flags: (cmd: Cmd.Node, version: boolean) => Table.Flag[];
    spec: (cmd: Cmd.Node, arg: Arg.Any) => Arg.Complete | undefined;
};
