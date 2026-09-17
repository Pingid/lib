import { Script } from './util.js';
import { Table } from './table.js';
/**
 * A fish script with the tree baked in. fish consumes `value\ttab` natively, so it
 * gets the richest output of the three.
 *
 * @example fish(Table.of(root), 'app') // '# app completion for fish…'
 */
export declare const fish: (entries: Table.Entry[], options: Script.Options) => string;
export declare const Fish: {
    fish: (entries: Table.Entry[], options: Script.Options) => string;
};
