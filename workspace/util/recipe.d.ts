export type RecipeConfig<T, R> = {
    options: T;
    execute: (options: Partial<T>) => Promise<R>;
};
export type RecipeApi<T extends Record<string, any>, R> = Promise<R> & {
    [K in keyof T]: T[K] extends boolean ? (value?: boolean) => RecipeApi<T, R> : (value: T[K]) => RecipeApi<T, R>;
};
export declare class Recipe {
    static builder: <T extends Record<string, any>, R>(opts: T, cb: (opts: Partial<T>) => Promise<R>) => (opts?: Partial<T> | undefined) => RecipeApi<T, R>;
    static create: <T extends Record<string, any>, R>(config: T, executer: (options: Partial<T>) => Promise<R>) => (opts?: Partial<T>) => RecipeApi<T, R>;
}
