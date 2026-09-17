import { Render } from '../core/render.js';
import { Resolve } from './resolve.js';
import { Cmd } from '../cmd.js';
/** Leading dashes keep it clear of any declared subcommand, and out of help. */
export declare const MARKER = "__complete";
export declare namespace Callback {
    interface Options extends Resolve.Options {
        out?: Render.Target | undefined;
    }
}
/**
 * The `__complete` protocol: one candidate per line as `value<TAB>description`, then a
 * `:directive` trailer that is always present.
 *
 * Always resolves 0. A non-zero exit is indistinguishable from a missing binary, and
 * would make every driver fall back for the wrong reason.
 *
 * @example callback(root, ['--', 'build', '--env', '']) // 'dev\nprod\n:none\n'
 */
export declare const callback: (root: Cmd.Node, argv: readonly string[], options?: Callback.Options) => Promise<number>;
export declare const Callback: {
    MARKER: string;
    callback: (root: Cmd.Node, argv: readonly string[], options?: Callback.Options) => Promise<number>;
};
