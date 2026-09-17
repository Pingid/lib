import { Static, TOptional, TSchema } from '@sinclair/typebox';
import { Compute } from './core/util.js';
import { Arg } from './arg.js';
import { Cmd } from './cmd.js';
export declare namespace Macro {
    /**
     * What `t.str()` and friends return: a TypeBox schema plus the command-line options,
     * with the value type and presence carried phantomly. `_` is required so it can be
     * told apart from a bare schema or a JSON literal — nothing reads it at runtime.
     */
    interface Field<T = unknown, P extends boolean = false> extends Arg.Options<any> {
        type: TSchema;
        _: (input: never) => [T, P];
    }
    /** The JSON literal shorthand: `{ type: 'number' }`, `{ type: 'string', enum: [...] }`. */
    type Json = Arg.Options<any> & ({
        readonly type: 'number' | 'integer' | 'boolean';
    } | {
        readonly type: 'string';
        readonly enum?: readonly (string | number)[];
    } | {
        readonly type: 'array';
        readonly items: Value;
    });
    /** Every accepted declaration form. */
    type Value = TSchema | Field<any, any> | Json;
    type Args = Record<string, Value>;
    /**
     * Present on the input when a schema is not `Type.Optional`, or when a literal form
     * declares `required` or a `default`. A bare `Type.String()` is required, matching
     * how the same schema behaves inside `Type.Object`.
     */
    type Present<V> = V extends Field<any, infer P> ? P : V extends TOptional<TSchema> ? false : V extends TSchema ? true : V extends {
        required: true;
    } ? true : V extends {
        default: any;
    } ? true : false;
    /** One declaration to its value type. */
    type Of<V> = V extends Field<infer T, boolean> ? T : V extends TSchema ? Exclude<Static<V>, undefined> : V extends {
        type: infer S;
    } ? S extends TSchema ? Exclude<Static<S>, undefined> : OfJson<V> : OfJson<V>;
    type OfJson<V> = V extends {
        type: 'number' | 'integer';
    } ? number : V extends {
        type: 'boolean';
    } ? boolean : V extends {
        type: 'string';
        enum: infer E;
    } ? E extends readonly (infer T)[] ? T : string : V extends {
        type: 'string';
    } ? string : V extends {
        type: 'array';
        items: infer I;
    } ? Of<I>[] : unknown;
    /** A record of declarations to the object a handler receives. */
    type Infer<A extends Args> = Compute<{
        [K in keyof A as Present<A[K]> extends true ? K : never]: Of<A[K]>;
    } & {
        [K in keyof A as Present<A[K]> extends true ? never : K]?: Of<A[K]>;
    }>;
    type Def<N extends string, A extends Args, R> = MethodDef<N, A, R> | GroupDef<N, A, R>;
    interface MethodDef<N extends string, A extends Args, R> {
        name: N;
        description?: string;
        usage?: string;
        options: A;
        /** Overrides any `positional: true` on the declarations themselves. */
        positionals?: readonly Extract<keyof A, string>[];
        handle: (args: Infer<A>) => R;
    }
    interface GroupDef<N extends string, A extends Args, R> {
        name: N;
        description?: string;
        usage?: string;
        options?: A;
        commands: Record<string, Cmd.Any>;
    }
}
export declare const str: {
    (description?: string): Macro.Field<string, false>;
    <const O extends Arg.Options<string>>(options: O): Macro.Field<string, Macro.Present<O>>;
};
export declare const num: {
    (description?: string): Macro.Field<number, false>;
    <const O extends Arg.Options<number>>(options: O): Macro.Field<number, Macro.Present<O>>;
};
export declare const int: {
    (description?: string): Macro.Field<number, false>;
    <const O extends Arg.Options<number>>(options: O): Macro.Field<number, Macro.Present<O>>;
};
export declare const bool: {
    (description?: string): Macro.Field<boolean, false>;
    <const O extends Arg.Options<boolean>>(options: O): Macro.Field<boolean, Macro.Present<O>>;
};
export declare const of: {
    <const V extends readonly (string | number)[]>(values: V, description?: string): Macro.Field<V[number], false>;
    <const V extends readonly (string | number)[], const O extends Arg.Options<V[number]>>(values: V, options: O): Macro.Field<V[number], Macro.Present<O>>;
    <const V extends readonly (string | number)[], const O extends Arg.Options<V[number]> & {
        enum: V;
    }>(options: O): Macro.Field<V[number], Macro.Present<O>>;
};
export declare const list: {
    (description?: string): Macro.Field<string[], false>;
    <const O extends Arg.Options<string[]>>(options: O): Macro.Field<string[], Macro.Present<O>>;
    <I extends Macro.Value>(items: I, description?: string): Macro.Field<Macro.Of<I>[], false>;
    <I extends Macro.Value, const O extends Arg.Options<Macro.Of<I>[]>>(items: I, options: O): Macro.Field<Macro.Of<I>[], Macro.Present<O>>;
};
/**
 * Build a command from a record of declarations. The args are assembled into a
 * `Type.Object` and handed to `Cmd.in`, so TypeBox refinements (`minLength`, ranges)
 * are validated, and aliases and descriptions carry through to help.
 */
export declare const cmd: <const N extends string, const A extends Macro.Args, R>(def: Macro.Def<N, A, R>) => Cmd<Macro.Infer<A>, Awaited<R>, {}, {}>;
declare const _default: {
    cmd: <const N extends string, const A extends Macro.Args, R>(def: Macro.Def<N, A, R>) => Cmd<Macro.Infer<A>, Awaited<R>, {}, {}>;
    str: {
        (description?: string): Macro.Field<string, false>;
        <const O extends Arg.Options<string>>(options: O): Macro.Field<string, Macro.Present<O>>;
    };
    num: {
        (description?: string): Macro.Field<number, false>;
        <const O extends Arg.Options<number>>(options: O): Macro.Field<number, Macro.Present<O>>;
    };
    int: {
        (description?: string): Macro.Field<number, false>;
        <const O extends Arg.Options<number>>(options: O): Macro.Field<number, Macro.Present<O>>;
    };
    bool: {
        (description?: string): Macro.Field<boolean, false>;
        <const O extends Arg.Options<boolean>>(options: O): Macro.Field<boolean, Macro.Present<O>>;
    };
    list: {
        (description?: string): Macro.Field<string[], false>;
        <const O extends Arg.Options<string[]>>(options: O): Macro.Field<string[], Macro.Present<O>>;
        <I extends Macro.Value>(items: I, description?: string): Macro.Field<Macro.Of<I>[], false>;
        <I extends Macro.Value, const O extends Arg.Options<Macro.Of<I>[]>>(items: I, options: O): Macro.Field<Macro.Of<I>[], Macro.Present<O>>;
    };
    enum: {
        <const V extends readonly (string | number)[]>(values: V, description?: string): Macro.Field<V[number], false>;
        <const V extends readonly (string | number)[], const O extends Arg.Options<V[number]>>(values: V, options: O): Macro.Field<V[number], Macro.Present<O>>;
        <const V extends readonly (string | number)[], const O extends Arg.Options<V[number]> & {
            enum: V;
        }>(options: O): Macro.Field<V[number], Macro.Present<O>>;
    };
};
export default _default;
