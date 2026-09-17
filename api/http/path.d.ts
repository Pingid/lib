import { Compute, Struct } from './util.js';
/**
 * Path patterns, as a type and at runtime.
 *
 * The supported syntax is the *intersection* of what Elysia and Hono accept — `:name`, a
 * `{regex}` constraint, a trailing `?`, and a `*` catch-all — so one path literal is valid in
 * every adapter, including the fetch one that has to match it itself.
 */
export declare namespace Path {
    /** Every parameter a literal path declares, required and optional alike. */
    type Keys<P extends string> = string extends P ? never : Name<Segment<P>>;
    /**
     * What the path contributes to a handler's input. An optional parameter becomes an optional
     * key rather than joining one flat union, which is the whole reason this is not `Keys`.
     *
     * A non-literal path widens to `Struct`: the claim check degrades to "no check" rather than
     * reporting every key as unbound, which is what a `let path = '/x/:id'` would otherwise do.
     */
    type Shape<P extends string> = string extends P ? Struct : Compute<{
        [K in Name<Mandatory<P>>]: string;
    } & {
        [K in Name<Optional<P>>]?: string;
    }>;
    type Segment<P extends string> = P extends `${infer H}/${infer R}` ? H | Segment<R> : P;
    type Mandatory<P extends string> = Exclude<Segment<P>, Optional<P>>;
    /** Tested on the raw segment, so `:id{a?b}` — which ends in `}` — stays mandatory. */
    type Optional<P extends string> = Extract<Segment<P>, `${string}?` | '*'>;
    /** `:name`, minus a `{regex}` constraint and a trailing `?`. A bare `*` binds as `'*'`. */
    type Name<S extends string> = S extends `:${infer B}` ? Strip<B> : S extends '*' ? '*' : never;
    /** Peels the constraint before the marker, so `:id{\d+}?` reduces to `id`. */
    type Strip<S extends string> = S extends `${infer N}{${string}}${infer T}` ? Strip<`${N}${T}`> : S extends `${infer N}?` ? N : S;
    interface Compiled {
        pattern: RegExp;
        /** Capture-group order, so a match can be zipped back into named values. */
        names: string[];
    }
}
export declare const Path: {
    compile: (path: string) => Path.Compiled;
    match: (compiled: Path.Compiled, pathname: string) => Record<string, string> | undefined;
    keys: (path: string) => string[];
};
