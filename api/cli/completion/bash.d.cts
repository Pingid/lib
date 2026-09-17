import { Script } from './util.cjs';
import { Table } from './table.cjs';
/**
 * A bash script with the tree baked in. Targets bash 3.2 (what macOS ships), so no
 * associative arrays, no `mapfile`, and every `compopt` guarded.
 *
 * @example bash(Table.of(root), 'app') // '# app completion for bash…'
 */
export declare const bash: (entries: Table.Entry[], options: Script.Options) => string;
export declare const Bash: {
    bash: (entries: Table.Entry[], options: Script.Options) => string;
};
