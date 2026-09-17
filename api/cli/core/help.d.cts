import { Render } from './render.cjs';
import { Cmd } from '../cmd.cjs';
export declare namespace Help {
    interface Options {
        target?: Render.Target | undefined;
        /** Include `--version` in the options list. Set by `Cli` for the root command. */
        version?: boolean | undefined;
    }
}
export declare const usage: (cmd: Cmd.Node) => string;
export declare const help: (cmd: Cmd.Node, options?: Help.Options) => void;
export declare const Help: {
    usage: (cmd: Cmd.Node) => string;
    help: (cmd: Cmd.Node, options?: Help.Options) => void;
};
