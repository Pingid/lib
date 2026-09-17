export type Shared = {
    cwd: string;
};
export type CommitOptions = {
    message: string;
    amend: boolean;
    no_edit: boolean;
};
export declare const commit: (opts?: Partial<CommitOptions & Shared> | undefined) => import('../util/recipe.cjs').RecipeApi<CommitOptions & Shared, string>;
export type TagOptions = {
    name: string;
};
export declare const tag: (opts?: Partial<TagOptions & Shared> | undefined) => import('../util/recipe.cjs').RecipeApi<TagOptions & Shared, string>;
export type PushOptions = {
    force: boolean;
};
export declare const push: (opts?: Partial<PushOptions & Shared> | undefined) => import('../util/recipe.cjs').RecipeApi<PushOptions & Shared, string>;
