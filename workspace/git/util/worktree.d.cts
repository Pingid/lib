export type CreateWorkTree = {
    /** The repository the worktree is attached to. Every git command runs here. */
    cwd: string;
    /** Where the branch starts from when it has to be created. */
    base: string;
    branch: string;
    /** Where to check it out. Relative paths resolve against `cwd`. Defaults to `.worktrees/<branch>`. */
    path?: string;
    /** Clear a stale registration or leftover directory first. */
    force?: boolean;
};
/** One entry of `git worktree list`. */
export type WorkTreeEntry = {
    path: string;
    head?: string;
    /** Short branch name, absent when the worktree is detached. */
    branch?: string;
    bare: boolean;
    detached: boolean;
    locked: boolean;
    prunable: boolean;
};
/**
 * Check `branch` out into its own directory, creating the branch from `base` if it is new.
 *
 * Returns the resolved path: git records a worktree by its real path, so anything derived
 * from a symlinked one (`/tmp` on macOS) would not match what `git worktree list` reports.
 */
export declare const create_work_tree: (opts: CreateWorkTree) => Promise<string>;
export declare const remove_work_tree: (dir: string, opts?: {
    cwd?: string;
    force?: boolean;
}) => Promise<void>;
/** The worktrees attached to the repository at `cwd`, the first being the main one. */
export declare const list_work_trees: (cwd?: string) => Promise<WorkTreeEntry[]>;
