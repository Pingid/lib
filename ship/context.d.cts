declare const CONTEXT: unique symbol;
/** A typed injection key. Values are supplied per `compose()` / `project()` call. */
export declare class Context<T = any> {
    /** @see {@link branded} */
    readonly [CONTEXT] = true;
    static [Symbol.hasInstance]: (value: unknown) => boolean;
    readonly label: string;
    private constructor();
    static define<T>(label?: string): Context<T>;
    create(value: T): ContextValue<T>;
}
declare const CONTEXT_VALUE: unique symbol;
export declare class ContextValue<T = any> {
    /** @see {@link branded} */
    readonly [CONTEXT_VALUE] = true;
    static [Symbol.hasInstance]: (value: unknown) => boolean;
    readonly context: Context<T>;
    readonly value: T;
    constructor(context: Context<T>, value: T);
}
export {};
