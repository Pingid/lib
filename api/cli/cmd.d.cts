import { Schema } from '../core/index.cjs';
import { Static, TObject } from '@sinclair/typebox/type';
import { Arg } from './arg.cjs';
import { Parse } from './core/parse.cjs';
import { Render } from './core/render.cjs';
import { Compute, Struct } from './core/util.cjs';
export declare namespace Cmd {
    type Node = Cmd<any, any, any, any>;
    /**
     * The shape an `Api` node already has. Accepted anywhere a `Cmd` is, and converted
     * structurally — so nothing here imports `Api`, and any object of this shape works.
     */
    interface Like<I extends Struct = any, O = any, C extends Struct = any> {
        name: string;
        description?: string | undefined;
        usage?: string | undefined;
        in?: Schema.Type<I> | undefined;
        /** Inherited by this node and everything under it; the values arrive as context. */
        options?: Schema.Type | undefined;
        positionals?: readonly string[] | undefined;
        /** Completion sources by arg name, for args declared in `in` or `options`. */
        completions?: Record<string, Arg.Complete> | undefined;
        methods?: readonly Like<any, any, C>[] | undefined;
        handle?: ((input: I, context: C) => O) | undefined;
    }
    type Any = Cmd.Node | Like;
    /** What a node still needs from its caller, after ancestors supply their options. */
    type Context<N> = N extends Cmd<any, any, infer C, any> ? C : N extends Like<any, any, infer C> ? C : {};
}
/**
 * A command: zero or more args of its own, zero or more subcommands, and optionally a
 * handler. All three are independent — a node with subcommands can still take args, and
 * a node with a handler can still nest.
 */
export declare class Cmd<I extends Struct = {}, O = unknown, C extends Struct = {}, S extends Struct = {}> {
    name: string;
    description: string | undefined;
    usage: string | undefined;
    parent: Cmd.Node | undefined;
    /** This command's own input. */
    args: Arg.Any[];
    /** Options this command contributes to itself and its subtree. */
    shared: Arg.Any[];
    commands: Cmd.Node[];
    /** Completion sources by arg name. The only route for args that came from a schema. */
    completions: Map<string, Arg.Complete>;
    /** Set when the input came from a schema, so `validate` has something to run. */
    schema: Schema.Type<I> | undefined;
    handler: ((input: any, context: any) => any) | undefined;
    private _positionals;
    readonly _types?: (input: I, context: C, shared: S) => O;
    constructor(name: string);
    static build(name: string): Cmd<{}, unknown, {}, {}>;
    /** Pass through a `Cmd`, or convert an api-shaped node. */
    static from(node: Cmd.Any): Cmd.Node;
    describe(description: string): this;
    /** Replaces the derived usage line verbatim. */
    use(usage: string): this;
    arg<const A extends readonly Arg.Any[]>(...args: A): Cmd<I & Arg.Fields<A[number]>, O, C, S>;
    /** Take the whole input from a schema. Aliases and descriptions are read off its properties. */
    in<T extends TObject>(schema: T): Cmd<Static<T>, O, C, S>;
    in<T extends Struct>(schema: Schema.Type<T>): Cmd<T, O, C, S>;
    /** Options inherited by this command and its subtree; their values arrive as context. */
    option<const A extends readonly Arg.Any[]>(...args: A): Cmd<I, O, C, S & Arg.Fields<A[number]>>;
    options<T extends TObject>(schema: T): Cmd<I, O, C, S & Static<T>>;
    options<T extends Struct>(schema: Schema.Type<T>): Cmd<I, O, C, S & T>;
    /**
     * Attach completion sources to args this command declared.
     *
     * @example Cmd.build('deploy').in(Input).complete({ env: ['dev', 'prod'], config: 'file' })
     */
    complete(sources: Record<string, Arg.Complete>): this;
    /** Declare what this command needs from `run`'s context, beyond what options supply. */
    context<T extends Struct>(): Cmd<I, O, C & T, S>;
    handle<R>(handler: (input: Compute<I>, context: Compute<C & S>) => R): Cmd<I, Awaited<R>, C, S>;
    /** Mounts a child, reparenting it. Ancestors' options cover the child's context. */
    with<const N extends readonly Cmd.Any[]>(...children: N): Cmd<I, O, C & Omit<Cmd.Context<N[number]>, keyof S>, S>;
    /** Read the positional order, or set it. An explicit list always wins over arg flags. */
    positional(): Arg.Any[];
    positional(names: readonly string[]): this;
    positionals(): string[];
    /** Own args that arrive as flags. */
    flags(): Arg.Any[];
    /** Options contributed by this command and every ancestor, outermost first. */
    globals(): Arg.Any[];
    /** Options declared anywhere below here — what `route` will accept ahead of a subcommand. */
    subtree(): Arg.Any[];
    path(): string[];
    root(): Cmd.Node;
    rename(name: string): this;
    find(name: string): Cmd.Node | undefined;
    /** Resolve a long name, kebab form, or short alias against own args, then globals. */
    lookup(token: string): Arg.Any | undefined;
    parse(argv: string[]): Parse.Result;
    /** Schema validation, when a schema was supplied. Argv coercion has already happened. */
    validate(input: Struct): Promise<I>;
    invoke(input: I, context: Compute<C & S>): O;
    help(target?: Render.Target): void;
    /** An explicit positional list overrides whatever the args declared for themselves. */
    private sync;
}
