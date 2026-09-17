import { RecipeApi } from '../../util/index.js';
/**
 * How an option is rendered on the command line.
 *
 * - `flag`: `--name`, emitted when set to `true` and omitted otherwise.
 * - `value`: `--name <value>`.
 * - `positional`: an operand, appended after every option in declaration order.
 */
export type ArgKind = 'flag' | 'value' | 'positional';
export type Arg<K extends ArgKind = ArgKind, T = unknown> = {
    kind: K;
    /** The literal switch, when it is not the option name with `_` turned into `-`. */
    name?: string;
    /** Phantom carrier for the value type; never read. */
    value: T;
};
export type Args = Record<string, Arg>;
/** A boolean switch. Optional in the builder, where `.amend()` means `.amend(true)`. */
export declare const flag: (name?: string) => Arg<"flag", boolean>;
/** A switch that carries a value, e.g. `--message <msg>`. */
export declare const value: <T extends string | number = string>(name?: string) => Arg<"value", T>;
/** An operand, e.g. the `<name>` in `git tag <name>`. Emitted after the switches. */
export declare const positional: <T extends string | number | string[] = string>() => Arg<"positional", T>;
type FlagKeys<T extends Args> = {
    [K in keyof T]: T[K]['kind'] extends 'flag' ? K : never;
}[keyof T];
/** The value object behind a set of {@link Args}: flags optional, everything else required. */
export type Values<T extends Args> = {
    [K in FlagKeys<T>]?: T[K]['value'];
} & {
    [K in Exclude<keyof T, FlagKeys<T>>]: T[K]['value'];
};
/** Options every git command accepts, independent of the subcommand. */
export type SharedOpts = {
    cwd?: string;
};
/**
 * Render a value object as argv, iterating the *declaration* rather than the values so the
 * order is stable and unknown keys (`cwd`, anything a caller invented) can never leak into
 * the command line.
 */
export declare const to_args: <T extends Args>(options: T, values: Partial<Values<T>>) => string[];
export type Command<T extends Args> = (init?: Partial<Values<T>> & SharedOpts) => RecipeApi<Values<T> & SharedOpts, string>;
/**
 * Turn a subcommand and its options into a lazy builder: `commit({ cwd }).message('x').amend()`
 * runs `git commit --message x --amend` in `cwd` and resolves with its stdout.
 */
export declare const recipe: <T extends Args>(params: string[], options: T) => Command<T>;
export {};
