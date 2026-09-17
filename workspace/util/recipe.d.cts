/**
 * A lazily-built command: options are collected by chained calls and the command only runs
 * when the result is awaited, so `cmd().a(1).b(2)` reads as one statement and executes once.
 */
export type RecipeConfig<T extends Record<string, any>, R> = {
    /** The settable options. Only these names become builder methods; the values are ignored. */
    options: {
        [K in keyof T]: unknown;
    };
    /** Fold one `.key(value)` call into the options collected so far. */
    resolve: <K extends keyof T>(opts: Partial<T>, key: K, value: T[K] | undefined) => Partial<T>;
    /** Run the command. Called at most once per builder, on first await. */
    execute: (options: Partial<T>) => Promise<R>;
};
/**
 * The builder surface: awaitable, plus one method per option. Options that may be omitted
 * (a `--flag` with an implied `true`) take an optional argument; the rest require one.
 */
export type RecipeApi<T extends Record<string, any>, R> = Promise<R> & {
    [K in RequiredKeys<T>]: (value: T[K]) => RecipeApi<T, R>;
} & {
    [K in OptionalKeys<T>]: (value?: T[K]) => RecipeApi<T, R>;
};
type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
type OptionalKeys<T> = keyof Omit<T, RequiredKeys<T>>;
export declare class Recipe {
    static create: <T extends Record<string, any>, R>(config: RecipeConfig<T, R>, opts?: Partial<T>) => RecipeApi<T, R>;
}
export {};
