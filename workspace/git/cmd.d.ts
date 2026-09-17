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
    all: import('./util/cmd.js').Arg<"flag", boolean>;
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    update: import('./util/cmd.js').Arg<"flag", boolean>;
    pathspec: import('./util/cmd.js').Arg<"positional", string[]>;
};
export type AddOpts = typeof AddOpts;
export declare const add: import('./util/cmd.js').Command<{
    all: import('./util/cmd.js').Arg<"flag", boolean>;
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    update: import('./util/cmd.js').Arg<"flag", boolean>;
    pathspec: import('./util/cmd.js').Arg<"positional", string[]>;
}>;
declare const CommitOpts: {
    message: import('./util/cmd.js').Arg<"value", string>;
    all: import('./util/cmd.js').Arg<"flag", boolean>;
    amend: import('./util/cmd.js').Arg<"flag", boolean>;
    no_edit: import('./util/cmd.js').Arg<"flag", boolean>;
    no_verify: import('./util/cmd.js').Arg<"flag", boolean>;
    allow_empty: import('./util/cmd.js').Arg<"flag", boolean>;
};
export type CommitOpts = typeof CommitOpts;
export declare const commit: import('./util/cmd.js').Command<{
    message: import('./util/cmd.js').Arg<"value", string>;
    all: import('./util/cmd.js').Arg<"flag", boolean>;
    amend: import('./util/cmd.js').Arg<"flag", boolean>;
    no_edit: import('./util/cmd.js').Arg<"flag", boolean>;
    no_verify: import('./util/cmd.js').Arg<"flag", boolean>;
    allow_empty: import('./util/cmd.js').Arg<"flag", boolean>;
}>;
declare const TagOpts: {
    message: import('./util/cmd.js').Arg<"value", string>;
    annotate: import('./util/cmd.js').Arg<"flag", boolean>;
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    delete: import('./util/cmd.js').Arg<"flag", boolean>;
    list: import('./util/cmd.js').Arg<"flag", boolean>;
    name: import('./util/cmd.js').Arg<"positional", string>;
    ref: import('./util/cmd.js').Arg<"positional", string>;
};
export type TagOpts = typeof TagOpts;
export declare const tag: import('./util/cmd.js').Command<{
    message: import('./util/cmd.js').Arg<"value", string>;
    annotate: import('./util/cmd.js').Arg<"flag", boolean>;
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    delete: import('./util/cmd.js').Arg<"flag", boolean>;
    list: import('./util/cmd.js').Arg<"flag", boolean>;
    name: import('./util/cmd.js').Arg<"positional", string>;
    ref: import('./util/cmd.js').Arg<"positional", string>;
}>;
declare const PushOpts: {
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    tags: import('./util/cmd.js').Arg<"flag", boolean>;
    delete: import('./util/cmd.js').Arg<"flag", boolean>;
    set_upstream: import('./util/cmd.js').Arg<"flag", boolean>;
    dry_run: import('./util/cmd.js').Arg<"flag", boolean>;
    remote: import('./util/cmd.js').Arg<"positional", string>;
    refspec: import('./util/cmd.js').Arg<"positional", string[]>;
};
export type PushOpts = typeof PushOpts;
export declare const push: import('./util/cmd.js').Command<{
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    tags: import('./util/cmd.js').Arg<"flag", boolean>;
    delete: import('./util/cmd.js').Arg<"flag", boolean>;
    set_upstream: import('./util/cmd.js').Arg<"flag", boolean>;
    dry_run: import('./util/cmd.js').Arg<"flag", boolean>;
    remote: import('./util/cmd.js').Arg<"positional", string>;
    refspec: import('./util/cmd.js').Arg<"positional", string[]>;
}>;
declare const FetchOpts: {
    all: import('./util/cmd.js').Arg<"flag", boolean>;
    prune: import('./util/cmd.js').Arg<"flag", boolean>;
    tags: import('./util/cmd.js').Arg<"flag", boolean>;
    depth: import('./util/cmd.js').Arg<"value", number>;
    remote: import('./util/cmd.js').Arg<"positional", string>;
    refspec: import('./util/cmd.js').Arg<"positional", string[]>;
};
export type FetchOpts = typeof FetchOpts;
export declare const fetch: import('./util/cmd.js').Command<{
    all: import('./util/cmd.js').Arg<"flag", boolean>;
    prune: import('./util/cmd.js').Arg<"flag", boolean>;
    tags: import('./util/cmd.js').Arg<"flag", boolean>;
    depth: import('./util/cmd.js').Arg<"value", number>;
    remote: import('./util/cmd.js').Arg<"positional", string>;
    refspec: import('./util/cmd.js').Arg<"positional", string[]>;
}>;
declare const BranchOpts: {
    list: import('./util/cmd.js').Arg<"flag", boolean>;
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    delete: import('./util/cmd.js').Arg<"flag", boolean>;
    move: import('./util/cmd.js').Arg<"flag", boolean>;
    name: import('./util/cmd.js').Arg<"positional", string>;
    start: import('./util/cmd.js').Arg<"positional", string>;
};
export type BranchOpts = typeof BranchOpts;
export declare const branch: import('./util/cmd.js').Command<{
    list: import('./util/cmd.js').Arg<"flag", boolean>;
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    delete: import('./util/cmd.js').Arg<"flag", boolean>;
    move: import('./util/cmd.js').Arg<"flag", boolean>;
    name: import('./util/cmd.js').Arg<"positional", string>;
    start: import('./util/cmd.js').Arg<"positional", string>;
}>;
declare const CheckoutOpts: {
    create: import('./util/cmd.js').Arg<"value", string>;
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    detach: import('./util/cmd.js').Arg<"flag", boolean>;
    ref: import('./util/cmd.js').Arg<"positional", string>;
};
export type CheckoutOpts = typeof CheckoutOpts;
export declare const checkout: import('./util/cmd.js').Command<{
    create: import('./util/cmd.js').Arg<"value", string>;
    force: import('./util/cmd.js').Arg<"flag", boolean>;
    detach: import('./util/cmd.js').Arg<"flag", boolean>;
    ref: import('./util/cmd.js').Arg<"positional", string>;
}>;
declare const StatusOpts: {
    porcelain: import('./util/cmd.js').Arg<"flag", boolean>;
    short: import('./util/cmd.js').Arg<"flag", boolean>;
    branch: import('./util/cmd.js').Arg<"flag", boolean>;
    pathspec: import('./util/cmd.js').Arg<"positional", string[]>;
};
export type StatusOpts = typeof StatusOpts;
export declare const status: import('./util/cmd.js').Command<{
    porcelain: import('./util/cmd.js').Arg<"flag", boolean>;
    short: import('./util/cmd.js').Arg<"flag", boolean>;
    branch: import('./util/cmd.js').Arg<"flag", boolean>;
    pathspec: import('./util/cmd.js').Arg<"positional", string[]>;
}>;
declare const DiffOpts: {
    cached: import('./util/cmd.js').Arg<"flag", boolean>;
    name_only: import('./util/cmd.js').Arg<"flag", boolean>;
    stat: import('./util/cmd.js').Arg<"flag", boolean>;
    ref: import('./util/cmd.js').Arg<"positional", string>;
    pathspec: import('./util/cmd.js').Arg<"positional", string[]>;
};
export type DiffOpts = typeof DiffOpts;
export declare const diff: import('./util/cmd.js').Command<{
    cached: import('./util/cmd.js').Arg<"flag", boolean>;
    name_only: import('./util/cmd.js').Arg<"flag", boolean>;
    stat: import('./util/cmd.js').Arg<"flag", boolean>;
    ref: import('./util/cmd.js').Arg<"positional", string>;
    pathspec: import('./util/cmd.js').Arg<"positional", string[]>;
}>;
declare const RevParseOpts: {
    verify: import('./util/cmd.js').Arg<"flag", boolean>;
    quiet: import('./util/cmd.js').Arg<"flag", boolean>;
    short: import('./util/cmd.js').Arg<"flag", boolean>;
    abbrev_ref: import('./util/cmd.js').Arg<"flag", boolean>;
    show_toplevel: import('./util/cmd.js').Arg<"flag", boolean>;
    git_dir: import('./util/cmd.js').Arg<"flag", boolean>;
    ref: import('./util/cmd.js').Arg<"positional", string>;
};
export type RevParseOpts = typeof RevParseOpts;
export declare const rev_parse: import('./util/cmd.js').Command<{
    verify: import('./util/cmd.js').Arg<"flag", boolean>;
    quiet: import('./util/cmd.js').Arg<"flag", boolean>;
    short: import('./util/cmd.js').Arg<"flag", boolean>;
    abbrev_ref: import('./util/cmd.js').Arg<"flag", boolean>;
    show_toplevel: import('./util/cmd.js').Arg<"flag", boolean>;
    git_dir: import('./util/cmd.js').Arg<"flag", boolean>;
    ref: import('./util/cmd.js').Arg<"positional", string>;
}>;
declare const CloneOpts: {
    depth: import('./util/cmd.js').Arg<"value", number>;
    branch: import('./util/cmd.js').Arg<"value", string>;
    single_branch: import('./util/cmd.js').Arg<"flag", boolean>;
    bare: import('./util/cmd.js').Arg<"flag", boolean>;
    url: import('./util/cmd.js').Arg<"positional", string>;
    dir: import('./util/cmd.js').Arg<"positional", string>;
};
export type CloneOpts = typeof CloneOpts;
export declare const clone: import('./util/cmd.js').Command<{
    depth: import('./util/cmd.js').Arg<"value", number>;
    branch: import('./util/cmd.js').Arg<"value", string>;
    single_branch: import('./util/cmd.js').Arg<"flag", boolean>;
    bare: import('./util/cmd.js').Arg<"flag", boolean>;
    url: import('./util/cmd.js').Arg<"positional", string>;
    dir: import('./util/cmd.js').Arg<"positional", string>;
}>;
export {};
