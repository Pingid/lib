import { Arg } from '../arg.js';
import { Cmd } from '../cmd.js';
export declare namespace Resolve {
    interface Options {
        /** Offer `--version` at the root. Mirrors `Table.Options`. */
        version?: boolean | undefined;
    }
    /** What the cursor word is. */
    type Kind = 'flag' | 'value' | 'operand' | 'none';
    interface Site {
        cmd: Cmd.Node;
        kind: Kind;
        /** The cursor word, with any `--flag=` or `-vn` prefix stripped off. */
        word: string;
        /** Text stripped off the front. Empty unless the word was glued. */
        prefix: string;
        /** Subcommands belong here too — slot 0 at a node the walk never left. */
        commands: boolean;
        arg?: Arg.Any | undefined;
        spec?: Arg.Complete | undefined;
        /** Positional slot index, for `operand`. */
        slot?: number | undefined;
    }
    type Directive = 'default' | 'none' | 'file' | 'dir';
    interface Result {
        site: Site;
        items: Arg.Item[];
        directive: Directive;
    }
}
/**
 * Place the cursor. The last of `words` is the one being edited, and `words[0]` is NOT the
 * binary — the caller strips it. Pure, synchronous, and never throws.
 *
 * @example site(root, ['build', '--env', 'd']).kind // 'value'
 * @example site(root, ['']).commands                // true
 */
export declare const site: (root: Cmd.Node, words: readonly string[]) => Resolve.Site;
/**
 * `site`, plus the values behind it. Never rejects — a thrown source is a wedged TAB key,
 * so anything unexpected degrades to "offer nothing, let the shell complete filenames".
 */
export declare const resolve: (root: Cmd.Node, words: readonly string[], options?: Resolve.Options) => Promise<Resolve.Result>;
export declare const Resolve: {
    site: (root: Cmd.Node, words: readonly string[]) => Resolve.Site;
    resolve: (root: Cmd.Node, words: readonly string[], options?: Resolve.Options) => Promise<Resolve.Result>;
};
