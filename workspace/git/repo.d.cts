import * as cmd from './cmd.cjs';
export declare class Repo {
    static discover(p?: {
        owner?: string;
        repo?: string;
        ref?: string;
        dir?: string;
    }): Promise<Repo>;
    readonly owner: string;
    readonly repo: string;
    readonly ref: string;
    readonly dir: string;
    constructor(owner: string, repo: string, ref: string, dir: string);
    token(): Promise<string>;
    origin(): Promise<string>;
    tags(filter?: string): Promise<string[]>;
    commit: (msg?: string) => import('../util/recipe.cjs').RecipeApi<cmd.CommitOptions & cmd.Shared, string>;
}
export declare class WorkTree extends Repo {
    readonly base: Repo;
    static create(base: Repo, branch: string, path?: string): Promise<WorkTree>;
    constructor(base: Repo, tree: Repo);
    remove(force?: boolean): Promise<void>;
}
