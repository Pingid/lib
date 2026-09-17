import { Shell } from '../shell/index.js';
export type Command<S extends Spec, R> = {
    (init?: Values<S> & Shell.ShellOptions): Builder<S, R>;
    /** The full argv a set of values renders to, without running anything. */
    argv(values?: Values<S>): string[];
    /** The spec the command was built from. */
    readonly spec: S;
};
export type CliConfig = {
    /** Arguments placed before every subcommand, e.g. `['--no-pager']`. */
    args?: string[];
    /** Shell options every command starts from. `env` is merged with a command's own. */
    shell?: Shell.ShellOptions;
};
/**
 * Bind a program, returning a factory for its commands: `factory(params, spec, mode?)`.
 * `params` is the fixed prefix (`['commit']`, `['remote', 'add']`); `mode` picks the
 * {@link Shell} runner — `sho` (stdout, throws on failure) by default — or takes a {@link Runner}.
 */
export declare const cli: (program: string, config?: CliConfig) => <S extends Spec, M extends Mode | Runner<unknown> = "sho">(params: string[], spec: S & NoReserved, mode?: M) => Command<S, Output<M>>;
/**
 * The builder: awaitable, plus one method per option and per shell option. Each call returns a
 * new builder, so branching off an earlier link leaves it untouched, and awaiting the same
 * builder twice runs the command once.
 */
export type Builder<S extends Spec, R> = Promise<R> & {
    readonly [K in keyof S]: Method<S[K], Builder<S, R>>;
} & {
    readonly [K in keyof Shell.ShellOptions]-?: (value: Shell.ShellOptions[K]) => Builder<S, R>;
};
/**
 * How an option is rendered on the command line.
 *
 * - `flag`: `--name`, emitted when `true` and omitted otherwise.
 * - `value`: `--name <value>` (or `--name=<value>`), repeated for each element of an array.
 * - `positional`: an operand, emitted after every switch, in declaration order.
 */
export type Kind = 'flag' | 'value' | 'positional';
export type Arg<K extends Kind = Kind, T = unknown> = {
    readonly kind: K;
    /** The literal switch, when it is not `--` plus the key with `_` turned into `-`. */
    readonly name?: string;
    /** `value` only: render as `--name=<value>` rather than two arguments. */
    readonly eq?: boolean;
    /** `positional` only: emit `--` before this operand, so a value starting with `-` stays an operand. */
    readonly dashdash?: boolean;
    /** Phantom carrier for the value type; never present at runtime. */
    readonly __type?: T;
};
/** A set of options, keyed by the name the builder method and value object use. */
export type Spec = Record<string, Arg>;
type Scalar = string | number;
/** A boolean switch. In the builder, `.amend()` means `.amend(true)`. */
export declare const flag: (name?: string) => Arg<"flag", boolean>;
/** A switch that carries a value, e.g. `--message <msg>`. An array type repeats the switch. */
export declare const value: <T extends Scalar | Scalar[] = string>(name?: string, options?: {
    eq?: boolean;
}) => Arg<"value", T>;
/** An operand, e.g. the `<name>` in `git tag <name>`. An array type spreads into several. */
export declare const positional: <T extends Scalar | Scalar[] = string>(options?: {
    dashdash?: boolean;
}) => Arg<"positional", T>;
type TypeOf<A> = A extends Arg<Kind, infer T> ? T : never;
/** The value object behind a spec. Every option may be left out. */
export type Values<S extends Spec> = {
    [K in keyof S]?: TypeOf<S[K]>;
};
/**
 * Render a value object as argv. Iterates the *spec* rather than the values, so the order is
 * stable and keys the spec doesn't declare (`cwd`, anything a caller invented) never leak in.
 * `undefined`, `null` and `false` all mean "leave it out".
 */
export declare const to_args: <S extends Spec>(spec: S, values: Values<S>) => string[];
/** Promise methods the builder forwards rather than treating as options. */
declare const THEN: readonly ["then", "catch", "finally"];
type Reserved = keyof Shell.ShellOptions | (typeof THEN)[number];
/** Makes a spec that uses a reserved name a type error, not just a runtime one. */
type NoReserved = {
    [K in Reserved]?: never;
};
/** What each {@link Shell} runner resolves with. */
type Outputs = {
    sho: string;
    sh: Shell.ShellResult;
    run: Shell.ShellResult;
    ok: boolean;
    io: Shell.ShellResult;
};
/** A {@link Shell} runner by name: what the command resolves with, and whether it throws. */
export type Mode = keyof Outputs;
/** A custom way to run the rendered command. */
export type Runner<R> = (cmd: string, args: string[], options: Shell.ShellOptions) => Promise<R>;
type Output<M> = M extends Mode ? Outputs[M] : M extends Runner<infer R> ? R : never;
type Method<A, Self> = A extends Arg<'flag'> ? (on?: boolean) => Self : (value: TypeOf<A>) => Self;
export {};
