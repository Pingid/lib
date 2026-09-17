/** A typed injection key. Values are supplied per `compose()` / `project()` call. */
export declare class Context<T = any> {
    readonly label: string;
    private constructor();
    static define<T>(label?: string): Context<T>;
    create(value: T): ContextValue<T>;
}
export declare class ContextValue<T = any> {
    readonly context: Context<T>;
    readonly value: T;
    constructor(context: Context<T>, value: T);
}
