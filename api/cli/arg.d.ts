import { Schema } from '../core/index.js';
import { Compute, Intersect } from './core/util.js';
import { Cmd } from './cmd.js';
export declare namespace Arg {
    type Any = Arg<string, any, boolean>;
    /** Completion the shell performs for itself. */
    type Source = 'file' | 'dir';
    /** One offer. A bare string is shorthand for `{ value }`. */
    interface Item {
        value: string;
        description?: string | undefined;
    }
    type Values = readonly (string | Item)[];
    /**
     * What a dynamic source is told. Deliberately small: the line is mid-edit, so there is
     * no parse to read sibling values off. Members are only ever added, so a source written
     * today keeps compiling.
     */
    interface Context {
        /** The command the cursor resolved to. */
        cmd: Cmd.Node;
        /** The arg being completed. */
        arg: Arg.Any;
        /** The partial token, with any `--flag=` or `-n` prefix already stripped. */
        word: string;
        /** Every word after the binary, up to and including `word`. */
        words: readonly string[];
    }
    /**
     * Values computed when the shell asks. Costs one subprocess per completion, so the
     * generated script only calls back for args that declare one.
     *
     * @example Arg.string('branch', { complete: (c) => branches(c.word) })
     * @example Arg.string('pod', { complete: async () => (await pods()).map((p) => ({ value: p.name, description: p.status })) })
     */
    type Fn = (context: Context) => Values | Promise<Values>;
    /**
     * Where an arg's values come from when completing.
     *
     * @example Arg.string('config', { complete: 'file' })
     * @example Arg.string('env', { complete: ['dev', 'prod'] })
     * @example Arg.string('branch', { complete: (c) => branches(c.word) })
     */
    type Complete = Source | readonly string[] | Fn;
    interface Options<T> {
        description?: string | undefined;
        default?: T | undefined;
        /** Fails the parse when absent. */
        required?: boolean | undefined;
        /** Taken from positional argv. A command's own `positional()` list overrides this. */
        positional?: boolean | undefined;
        /** Short forms: `alias: 'v'` or `alias: ['v']` binds `-v`. */
        alias?: string | readonly string[] | undefined;
        /** Where the values come from when completing. */
        complete?: Complete | undefined;
    }
    /** Present on the input when declared required or carrying a default. */
    type Present<O> = O extends {
        required: true;
    } ? true : O extends {
        default: any;
    } ? true : false;
    type Field<A> = A extends Arg<infer N, infer T, true> ? {
        [K in N]: T;
    } : A extends Arg<infer N, infer T, boolean> ? {
        [K in N]?: T;
    } : {};
    /** Args (usually a union of them) to the object shape they contribute. */
    type Fields<A> = Compute<Intersect<A extends any ? Field<A> : never>>;
}
/**
 * A single named input: its JSON Schema fragment plus how it arrives on the command
 * line. Standalone — an arg does not know which command it belongs to, so it can be
 * declared once and reused.
 */
export declare class Arg<N extends string = string, T = unknown, P extends boolean = false> {
    name: N;
    json: Schema.Json;
    required: boolean;
    positional: boolean;
    /** Kept off `json`: a function has to survive here once dynamic sources land. */
    complete: Arg.Complete | undefined;
    readonly _?: (input: never) => [T, P];
    constructor(name: N, json: Schema.Json, options?: Arg.Options<any>);
    static of<const N extends string, T = unknown, const O extends Arg.Options<T> = {}>(name: N, json: Schema.Json, options?: O): Arg<N, T, Arg.Present<O>>;
    static string<const N extends string = '', const O extends Arg.Options<string> = {}>(name?: N, options?: O): Arg<N, string, Arg.Present<O>>;
    static number<const N extends string = '', const O extends Arg.Options<number> = {}>(name?: N, options?: O): Arg<N, number, Arg.Present<O>>;
    static integer<const N extends string = '', const O extends Arg.Options<number> = {}>(name?: N, options?: O): Arg<N, number, Arg.Present<O>>;
    /** Never consumes a following token; accepts `--no-` negation. */
    static boolean<const N extends string = '', const O extends Arg.Options<boolean> = {}>(name?: N, options?: O): Arg<N, boolean, Arg.Present<O>>;
    static enum<const V extends readonly (string | number | boolean)[], const N extends string = '', const O extends Arg.Options<V[number]> = {}>(values: V, name?: N, options?: O): Arg<N, V[number], Arg.Present<O>>;
    /** Repeats as a flag (`--tag a --tag b`), or soaks up the remaining positionals. */
    static array<A extends Arg.Any, const N extends string = '', const O extends Arg.Options<Arg.Field<A>[keyof Arg.Field<A>][]> = {}>(items: A, name?: N, options?: O): Arg<N, Item<A>[], Arg.Present<O>>;
    /** A JSON literal, parsed from the token. */
    static json<T = unknown, const N extends string = '', const O extends Arg.Options<T> = {}>(name?: N, options?: O): Arg<N, T, Arg.Present<O>>;
    /** Lift a property of an object schema, taking requiredness from its parent. */
    static from(name: string, json: Schema.Json, required?: boolean): Arg.Any;
    get description(): string | undefined;
    default(): unknown;
    type(): string | undefined;
    boolean(): boolean;
    variadic(): boolean;
    /** `enum`, or a union of `const` branches — TypeBox emits literal unions as `anyOf`. */
    choices(): unknown[] | undefined;
    /**
     * @example Arg.string('path', { complete: 'file' }).completion() // 'file'
     * @example Arg.enum(['dev', 'prod'], 'env').completion() // ['dev', 'prod']
     * @example Arg.boolean('force').completion() // ['true', 'false']
     */
    completion(): Arg.Complete | undefined;
    aliases(): string[];
    flag(): string;
    matches(token: string): boolean;
    /** How the arg is named in errors. */
    token(): string;
    placeholder(): string;
    hint(): string;
    /** The left column of the options list. */
    label(): string;
    /** The right column: description, then defaults and requiredness. */
    summary(): string;
    /** Collected tokens to a typed value. Last one wins unless the arg is variadic. */
    decode(tokens: string[]): unknown;
    /** `Coerce.token` decides; this only turns its expectation into the command-line message. */
    private coerce;
    /** No `cmd` — `Parse` attaches it with `CliError.at` once it knows. */
    private invalid;
}
type Item<A> = A extends Arg<any, infer T, any> ? T : never;
/** Re-exported so the cli surface is unchanged; both now live in `core` for the http layer. */
export { kebab, format } from '../core/text.js';
