import * as util from './util/index.js';
/**
 * A git working directory. Every command is bound to `dir`, so nothing here can quietly act
 * on whichever repository the process happens to be sitting in.
 */
export declare class Git {
    /** The token to authenticate remotes with. Environment-derived, so it is not per-checkout. */
    static token: () => Promise<string>;
    readonly dir: string;
    constructor(dir: string);
    /** Stage `pathspec`, or everything when none is given. */
    add: (...pathspec: string[]) => import('../util/recipe.js').RecipeApi<{
        all?: boolean | undefined;
        force?: boolean | undefined;
        update?: boolean | undefined;
    } & {
        pathspec: string[];
    } & util.SharedOpts, string>;
    commit: (message?: string) => import('../util/recipe.js').RecipeApi<{
        all?: boolean | undefined;
        amend?: boolean | undefined;
        no_edit?: boolean | undefined;
        no_verify?: boolean | undefined;
        allow_empty?: boolean | undefined;
    } & {
        message: string;
    } & util.SharedOpts, string>;
    tag: (name?: string, ref?: string) => import('../util/recipe.js').RecipeApi<{
        list?: boolean | undefined;
        force?: boolean | undefined;
        annotate?: boolean | undefined;
        delete?: boolean | undefined;
    } & {
        name: string;
        message: string;
        ref: string;
    } & util.SharedOpts, string>;
    push: (remote?: string, ...refspec: string[]) => import('../util/recipe.js').RecipeApi<{
        force?: boolean | undefined;
        delete?: boolean | undefined;
        tags?: boolean | undefined;
        set_upstream?: boolean | undefined;
        dry_run?: boolean | undefined;
    } & {
        remote: string;
        refspec: string[];
    } & util.SharedOpts, string>;
    fetch: (remote?: string, ...refspec: string[]) => import('../util/recipe.js').RecipeApi<{
        all?: boolean | undefined;
        prune?: boolean | undefined;
        tags?: boolean | undefined;
    } & {
        remote: string;
        refspec: string[];
        depth: number;
    } & util.SharedOpts, string>;
    branch: (name?: string, start?: string) => import('../util/recipe.js').RecipeApi<{
        list?: boolean | undefined;
        force?: boolean | undefined;
        delete?: boolean | undefined;
        move?: boolean | undefined;
    } & {
        name: string;
        start: string;
    } & util.SharedOpts, string>;
    checkout: (ref?: string) => import('../util/recipe.js').RecipeApi<{
        force?: boolean | undefined;
        detach?: boolean | undefined;
    } & {
        ref: string;
        create: string;
    } & util.SharedOpts, string>;
    status: () => import('../util/recipe.js').RecipeApi<{
        short?: boolean | undefined;
        branch?: boolean | undefined;
        porcelain?: boolean | undefined;
    } & {
        pathspec: string[];
    } & util.SharedOpts, string>;
    diff: (ref?: string) => import('../util/recipe.js').RecipeApi<{
        cached?: boolean | undefined;
        name_only?: boolean | undefined;
        stat?: boolean | undefined;
    } & {
        pathspec: string[];
        ref: string;
    } & util.SharedOpts, string>;
    rev_parse: (ref?: string) => import('../util/recipe.js').RecipeApi<{
        short?: boolean | undefined;
        verify?: boolean | undefined;
        quiet?: boolean | undefined;
        abbrev_ref?: boolean | undefined;
        show_toplevel?: boolean | undefined;
        git_dir?: boolean | undefined;
    } & {
        ref: string;
    } & util.SharedOpts, string>;
    /** Escape hatch for anything without a recipe. Resolves with trimmed stdout. */
    git: (...args: string[]) => Promise<string>;
    /** The absolute path of the working tree root, which `dir` may be a subdirectory of. */
    root: () => Promise<string>;
    /** The commit a ref resolves to. */
    head: (ref?: string) => Promise<string>;
    /** The checked-out branch, or `HEAD` when detached. */
    current_branch: () => Promise<string>;
    /** Tag names, optionally narrowed by a glob such as `build-*`. */
    tags: (filter?: string) => Promise<string[]>;
    /** Local branch names. */
    branches: () => Promise<string[]>;
    /** Whether a ref exists and resolves. */
    has: (ref: string) => Promise<boolean>;
    /** Whether the working tree has any change at all, staged or not, tracked or not. */
    dirty: () => Promise<boolean>;
    /** Whether anything is staged — the question `git diff --cached --quiet` answers by exit code. */
    staged: () => Promise<boolean>;
    /** The URL of a remote, `origin` by default. */
    remote_url: (name?: string) => Promise<string>;
    /** Every worktree attached to this repository, the main one first. */
    worktrees: () => Promise<util.WorkTreeEntry[]>;
}
/** A checkout that also knows which remote repository it is, and at what commit. */
export declare class Repo extends Git {
    /**
     * Identify the repository containing `dir` (the process directory by default), taking the
     * name from CI, the `origin` remote or `gh`, in that order. Anything passed explicitly wins.
     */
    static discover(p?: {
        owner?: string;
        repo?: string;
        ref?: string;
        dir?: string;
    }): Promise<Repo>;
    readonly owner: string;
    readonly repo: string;
    /** The commit (or branch, for a worktree) this instance stands for. */
    readonly ref: string;
    constructor(owner: string, repo: string, ref: string, dir: string);
    /** `owner/repo`. */
    get name(): string;
    /** The URL to push to: this checkout's `origin` when it matches, else the canonical one. */
    origin(): Promise<string>;
    /** Check `branch` out into its own directory, branching from this ref if it is new. */
    worktree(branch: string, opts?: {
        path?: string;
        force?: boolean;
    }): Promise<WorkTree>;
}
/**
 * A second checkout of the same repository on another branch, so a build can be committed
 * without disturbing the tree you are working in.
 */
export declare class WorkTree extends Repo {
    readonly base: Repo;
    static create(base: Repo, branch: string, opts?: {
        path?: string;
        force?: boolean;
    }): Promise<WorkTree>;
    constructor(base: Repo, tree: Repo);
    /** Detach the worktree and delete its directory. The branch itself is kept. */
    remove(force?: boolean): Promise<void>;
    /** `await using tree = await repo.worktree('pkg')` cleans up however the block exits. */
    [Symbol.asyncDispose](): Promise<void>;
}
