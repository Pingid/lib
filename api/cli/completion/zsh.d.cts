import { Script } from './util.cjs';
import { Table } from './table.cjs';
/**
 * A zsh script with the tree baked in. zsh keeps `--flag=value` as one word and has
 * real arrays, so descriptions survive here where bash drops them.
 *
 * @example zsh(Table.of(root), 'app') // '#compdef app…'
 */
export declare const zsh: (entries: Table.Entry[], options: Script.Options) => string;
export declare const Zsh: {
    zsh: (entries: Table.Entry[], options: Script.Options) => string;
};
