import { Table } from './table.cjs';
export declare namespace Script {
    interface Options {
        /** Binary the script registers against. */
        name: string;
        /** Words to exec for a callback. Undefined emits a script that never calls back. */
        invoke?: string[] | undefined;
    }
}
/** @example words('bun /app/cli.ts') // ['bun', '/app/cli.ts'] */
export declare const words: (value: string | readonly string[]) => string[];
/** Collapse whitespace, so a description can never break the tab-separated wire. */
export declare const clean: (value: string | undefined) => string | undefined;
/** A shell function name: `my-app` -> `my_app`. */
export declare const slug: (name: string) => string;
/** @example quote("it's") // "'it'\\''s'" */
export declare const quote: (value: string) => string;
/** fish only honours `\\` and `\'` inside single quotes. */
export declare const escape: (value: string) => string;
export declare const key: (path: string[]) => string;
/** Flags the walk must skip a token for. */
export declare const takes: (entry: Table.Entry) => string[];
/** Every non-kebab command spelling in the tree, paired with the canonical one. */
export declare const aliases: (entries: Table.Entry[]) => [string, string][];
/** Every flag spelling, long forms first. */
export declare const names: (entry: Table.Entry) => string[];
/**
 * Value specs keyed as the drivers look them up: a flag by each of its spellings, a
 * positional by slot.
 *
 * @example specs(entry) // [[['--env', '-e'], ['dev', 'prod']], [['@0'], 'file']]
 */
export declare const specs: (entry: Table.Entry) => [keys: string[], spec: Exclude<Table.Entry["positionals"][number], undefined>][];
