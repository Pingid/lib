import * as util from './util/index.cjs';
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
    add: (...pathspec: string[]) => import('../tcli/tcli.cjs').Builder<{
        all: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        force: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        update: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        pathspec: import('../tcli/tcli.cjs').Arg<"positional", string[]>;
    }, string>;
    commit: (message?: string) => import('../tcli/tcli.cjs').Builder<{
        message: import('../tcli/tcli.cjs').Arg<"value", string>;
        all: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        amend: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        no_edit: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        no_verify: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        allow_empty: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
    }, string>;
    tag: (name?: string, ref?: string) => import('../tcli/tcli.cjs').Builder<{
        message: import('../tcli/tcli.cjs').Arg<"value", string>;
        annotate: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        force: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        delete: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        list: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        name: import('../tcli/tcli.cjs').Arg<"positional", string>;
        ref: import('../tcli/tcli.cjs').Arg<"positional", string>;
    }, string>;
    push: (remote?: string, ...refspec: string[]) => import('../tcli/tcli.cjs').Builder<{
        force: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        tags: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        delete: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        set_upstream: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        dry_run: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        remote: import('../tcli/tcli.cjs').Arg<"positional", string>;
        refspec: import('../tcli/tcli.cjs').Arg<"positional", string[]>;
    }, string>;
    fetch: (remote?: string, ...refspec: string[]) => import('../tcli/tcli.cjs').Builder<{
        all: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        prune: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        tags: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        depth: import('../tcli/tcli.cjs').Arg<"value", number>;
        remote: import('../tcli/tcli.cjs').Arg<"positional", string>;
        refspec: import('../tcli/tcli.cjs').Arg<"positional", string[]>;
    }, string>;
    branch: (name?: string, start?: string) => import('../tcli/tcli.cjs').Builder<{
        list: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        force: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        delete: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        move: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        name: import('../tcli/tcli.cjs').Arg<"positional", string>;
        start: import('../tcli/tcli.cjs').Arg<"positional", string>;
    }, string>;
    checkout: (ref?: string) => import('../tcli/tcli.cjs').Builder<{
        create: import('../tcli/tcli.cjs').Arg<"value", string>;
        force: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        detach: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        ref: import('../tcli/tcli.cjs').Arg<"positional", string>;
    }, string>;
    status: () => import('../tcli/tcli.cjs').Builder<{
        porcelain: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        short: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        branch: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        pathspec: import('../tcli/tcli.cjs').Arg<"positional", string[]>;
    }, string>;
    diff: (ref?: string) => import('../tcli/tcli.cjs').Builder<{
        cached: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        name_only: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        stat: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        ref: import('../tcli/tcli.cjs').Arg<"positional", string>;
        pathspec: import('../tcli/tcli.cjs').Arg<"positional", string[]>;
    }, string>;
    rev_parse: (ref?: string) => import('../tcli/tcli.cjs').Builder<{
        verify: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        quiet: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        short: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        abbrev_ref: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        show_toplevel: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        git_dir: import('../tcli/tcli.cjs').Arg<"flag", boolean>;
        ref: import('../tcli/tcli.cjs').Arg<"positional", string>;
    }, string>;
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
