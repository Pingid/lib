/**
 * The git subcommands as lazy builders. Each takes the options it should start with and
 * returns a chainable, awaitable recipe resolving to the command's stdout:
 *
 * ```ts
 * await commit({ cwd }).message('release').amend().no_edit()
 * ```
 *
 * Every builder also accepts `.cwd(dir)`, which selects the repository rather than being
 * passed to git.
 */
declare const AddOpts: {
    all: import('./util/cmd.cjs').Arg<"flag", boolean>;
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    update: import('./util/cmd.cjs').Arg<"flag", boolean>;
    pathspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
};
export type AddOpts = typeof AddOpts;
export declare const add: import('./util/cmd.cjs').Command<{
    all: import('./util/cmd.cjs').Arg<"flag", boolean>;
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    update: import('./util/cmd.cjs').Arg<"flag", boolean>;
    pathspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
}>;
declare const CommitOpts: {
    message: import('./util/cmd.cjs').Arg<"value", string>;
    all: import('./util/cmd.cjs').Arg<"flag", boolean>;
    amend: import('./util/cmd.cjs').Arg<"flag", boolean>;
    no_edit: import('./util/cmd.cjs').Arg<"flag", boolean>;
    no_verify: import('./util/cmd.cjs').Arg<"flag", boolean>;
    allow_empty: import('./util/cmd.cjs').Arg<"flag", boolean>;
};
export type CommitOpts = typeof CommitOpts;
export declare const commit: import('./util/cmd.cjs').Command<{
    message: import('./util/cmd.cjs').Arg<"value", string>;
    all: import('./util/cmd.cjs').Arg<"flag", boolean>;
    amend: import('./util/cmd.cjs').Arg<"flag", boolean>;
    no_edit: import('./util/cmd.cjs').Arg<"flag", boolean>;
    no_verify: import('./util/cmd.cjs').Arg<"flag", boolean>;
    allow_empty: import('./util/cmd.cjs').Arg<"flag", boolean>;
}>;
declare const TagOpts: {
    message: import('./util/cmd.cjs').Arg<"value", string>;
    annotate: import('./util/cmd.cjs').Arg<"flag", boolean>;
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    delete: import('./util/cmd.cjs').Arg<"flag", boolean>;
    list: import('./util/cmd.cjs').Arg<"flag", boolean>;
    name: import('./util/cmd.cjs').Arg<"positional", string>;
    ref: import('./util/cmd.cjs').Arg<"positional", string>;
};
export type TagOpts = typeof TagOpts;
export declare const tag: import('./util/cmd.cjs').Command<{
    message: import('./util/cmd.cjs').Arg<"value", string>;
    annotate: import('./util/cmd.cjs').Arg<"flag", boolean>;
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    delete: import('./util/cmd.cjs').Arg<"flag", boolean>;
    list: import('./util/cmd.cjs').Arg<"flag", boolean>;
    name: import('./util/cmd.cjs').Arg<"positional", string>;
    ref: import('./util/cmd.cjs').Arg<"positional", string>;
}>;
declare const PushOpts: {
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    tags: import('./util/cmd.cjs').Arg<"flag", boolean>;
    delete: import('./util/cmd.cjs').Arg<"flag", boolean>;
    set_upstream: import('./util/cmd.cjs').Arg<"flag", boolean>;
    dry_run: import('./util/cmd.cjs').Arg<"flag", boolean>;
    remote: import('./util/cmd.cjs').Arg<"positional", string>;
    refspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
};
export type PushOpts = typeof PushOpts;
export declare const push: import('./util/cmd.cjs').Command<{
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    tags: import('./util/cmd.cjs').Arg<"flag", boolean>;
    delete: import('./util/cmd.cjs').Arg<"flag", boolean>;
    set_upstream: import('./util/cmd.cjs').Arg<"flag", boolean>;
    dry_run: import('./util/cmd.cjs').Arg<"flag", boolean>;
    remote: import('./util/cmd.cjs').Arg<"positional", string>;
    refspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
}>;
declare const FetchOpts: {
    all: import('./util/cmd.cjs').Arg<"flag", boolean>;
    prune: import('./util/cmd.cjs').Arg<"flag", boolean>;
    tags: import('./util/cmd.cjs').Arg<"flag", boolean>;
    depth: import('./util/cmd.cjs').Arg<"value", number>;
    remote: import('./util/cmd.cjs').Arg<"positional", string>;
    refspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
};
export type FetchOpts = typeof FetchOpts;
export declare const fetch: import('./util/cmd.cjs').Command<{
    all: import('./util/cmd.cjs').Arg<"flag", boolean>;
    prune: import('./util/cmd.cjs').Arg<"flag", boolean>;
    tags: import('./util/cmd.cjs').Arg<"flag", boolean>;
    depth: import('./util/cmd.cjs').Arg<"value", number>;
    remote: import('./util/cmd.cjs').Arg<"positional", string>;
    refspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
}>;
declare const BranchOpts: {
    list: import('./util/cmd.cjs').Arg<"flag", boolean>;
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    delete: import('./util/cmd.cjs').Arg<"flag", boolean>;
    move: import('./util/cmd.cjs').Arg<"flag", boolean>;
    name: import('./util/cmd.cjs').Arg<"positional", string>;
    start: import('./util/cmd.cjs').Arg<"positional", string>;
};
export type BranchOpts = typeof BranchOpts;
export declare const branch: import('./util/cmd.cjs').Command<{
    list: import('./util/cmd.cjs').Arg<"flag", boolean>;
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    delete: import('./util/cmd.cjs').Arg<"flag", boolean>;
    move: import('./util/cmd.cjs').Arg<"flag", boolean>;
    name: import('./util/cmd.cjs').Arg<"positional", string>;
    start: import('./util/cmd.cjs').Arg<"positional", string>;
}>;
declare const CheckoutOpts: {
    create: import('./util/cmd.cjs').Arg<"value", string>;
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    detach: import('./util/cmd.cjs').Arg<"flag", boolean>;
    ref: import('./util/cmd.cjs').Arg<"positional", string>;
};
export type CheckoutOpts = typeof CheckoutOpts;
export declare const checkout: import('./util/cmd.cjs').Command<{
    create: import('./util/cmd.cjs').Arg<"value", string>;
    force: import('./util/cmd.cjs').Arg<"flag", boolean>;
    detach: import('./util/cmd.cjs').Arg<"flag", boolean>;
    ref: import('./util/cmd.cjs').Arg<"positional", string>;
}>;
declare const StatusOpts: {
    porcelain: import('./util/cmd.cjs').Arg<"flag", boolean>;
    short: import('./util/cmd.cjs').Arg<"flag", boolean>;
    branch: import('./util/cmd.cjs').Arg<"flag", boolean>;
    pathspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
};
export type StatusOpts = typeof StatusOpts;
export declare const status: import('./util/cmd.cjs').Command<{
    porcelain: import('./util/cmd.cjs').Arg<"flag", boolean>;
    short: import('./util/cmd.cjs').Arg<"flag", boolean>;
    branch: import('./util/cmd.cjs').Arg<"flag", boolean>;
    pathspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
}>;
declare const DiffOpts: {
    cached: import('./util/cmd.cjs').Arg<"flag", boolean>;
    name_only: import('./util/cmd.cjs').Arg<"flag", boolean>;
    stat: import('./util/cmd.cjs').Arg<"flag", boolean>;
    ref: import('./util/cmd.cjs').Arg<"positional", string>;
    pathspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
};
export type DiffOpts = typeof DiffOpts;
export declare const diff: import('./util/cmd.cjs').Command<{
    cached: import('./util/cmd.cjs').Arg<"flag", boolean>;
    name_only: import('./util/cmd.cjs').Arg<"flag", boolean>;
    stat: import('./util/cmd.cjs').Arg<"flag", boolean>;
    ref: import('./util/cmd.cjs').Arg<"positional", string>;
    pathspec: import('./util/cmd.cjs').Arg<"positional", string[]>;
}>;
declare const RevParseOpts: {
    verify: import('./util/cmd.cjs').Arg<"flag", boolean>;
    quiet: import('./util/cmd.cjs').Arg<"flag", boolean>;
    short: import('./util/cmd.cjs').Arg<"flag", boolean>;
    abbrev_ref: import('./util/cmd.cjs').Arg<"flag", boolean>;
    show_toplevel: import('./util/cmd.cjs').Arg<"flag", boolean>;
    git_dir: import('./util/cmd.cjs').Arg<"flag", boolean>;
    ref: import('./util/cmd.cjs').Arg<"positional", string>;
};
export type RevParseOpts = typeof RevParseOpts;
export declare const rev_parse: import('./util/cmd.cjs').Command<{
    verify: import('./util/cmd.cjs').Arg<"flag", boolean>;
    quiet: import('./util/cmd.cjs').Arg<"flag", boolean>;
    short: import('./util/cmd.cjs').Arg<"flag", boolean>;
    abbrev_ref: import('./util/cmd.cjs').Arg<"flag", boolean>;
    show_toplevel: import('./util/cmd.cjs').Arg<"flag", boolean>;
    git_dir: import('./util/cmd.cjs').Arg<"flag", boolean>;
    ref: import('./util/cmd.cjs').Arg<"positional", string>;
}>;
declare const CloneOpts: {
    depth: import('./util/cmd.cjs').Arg<"value", number>;
    branch: import('./util/cmd.cjs').Arg<"value", string>;
    single_branch: import('./util/cmd.cjs').Arg<"flag", boolean>;
    bare: import('./util/cmd.cjs').Arg<"flag", boolean>;
    url: import('./util/cmd.cjs').Arg<"positional", string>;
    dir: import('./util/cmd.cjs').Arg<"positional", string>;
};
export type CloneOpts = typeof CloneOpts;
export declare const clone: import('./util/cmd.cjs').Command<{
    depth: import('./util/cmd.cjs').Arg<"value", number>;
    branch: import('./util/cmd.cjs').Arg<"value", string>;
    single_branch: import('./util/cmd.cjs').Arg<"flag", boolean>;
    bare: import('./util/cmd.cjs').Arg<"flag", boolean>;
    url: import('./util/cmd.cjs').Arg<"positional", string>;
    dir: import('./util/cmd.cjs').Arg<"positional", string>;
}>;
export {};
