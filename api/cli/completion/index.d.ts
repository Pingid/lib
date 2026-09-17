import { Cmd } from '../cmd.js';
import { Table } from './table.js';
export type { Table } from './table.js';
export type { Resolve } from './resolve.js';
export { resolve, site } from './resolve.js';
export { MARKER, callback } from './callback.js';
export declare namespace Completion {
    type Shell = 'bash' | 'zsh' | 'fish';
    interface Options extends Table.Options {
        /** Binary the script registers against. Defaults to the root command's name. */
        name?: string | undefined;
        /**
         * Command the script re-execs for values it cannot bake in. Defaults to `name`, which
         * is right for an installed binary and wrong for `bun some/file.ts` — hence the flag.
         */
        invoke?: string | readonly string[] | undefined;
        /** Emit a script that never calls back, at the cost of the forms it cannot place. */
        static?: boolean | undefined;
    }
}
/**
 * @example script('zsh', cli.root, { name: 'app', version: true })
 */
export declare const script: (shell: Completion.Shell, root: Cmd.Node, options?: Completion.Options) => string;
/**
 * Mount this to give a CLI `app completion bash|zsh|fish`. The script is a snapshot of
 * the tree, so it is regenerated after an upgrade rather than kept in step by itself.
 *
 * @example Cli.build({ binary: 'app' }).with(Completion.command())
 * @example cli.with(Completion.command({ version: true })) // also offer `--version`
 */
export declare const command: (options?: Completion.Options) => Cmd.Node;
export declare const Completion: {
    of: (root: Cmd.Node, options?: Table.Options) => Table.Entry[];
    script: (shell: Completion.Shell, root: Cmd.Node, options?: Completion.Options) => string;
    command: (options?: Completion.Options) => Cmd.Node;
    bash: (entries: Table.Entry[], options: import("./util.js").Script.Options) => string;
    zsh: (entries: Table.Entry[], options: import("./util.js").Script.Options) => string;
    fish: (entries: Table.Entry[], options: import("./util.js").Script.Options) => string;
    callback: (root: Cmd.Node, argv: readonly string[], options?: import("./callback.js").Callback.Options) => Promise<number>;
    MARKER: string;
};
