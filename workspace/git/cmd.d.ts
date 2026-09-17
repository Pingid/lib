import { Tcli } from '../tcli/index.js';
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
    all: Tcli.Arg<"flag", boolean>;
    force: Tcli.Arg<"flag", boolean>;
    update: Tcli.Arg<"flag", boolean>;
    pathspec: Tcli.Arg<"positional", string[]>;
};
export type AddOpts = typeof AddOpts;
export declare const add: Tcli.Command<{
    all: Tcli.Arg<"flag", boolean>;
    force: Tcli.Arg<"flag", boolean>;
    update: Tcli.Arg<"flag", boolean>;
    pathspec: Tcli.Arg<"positional", string[]>;
}, string>;
declare const CommitOpts: {
    message: Tcli.Arg<"value", string>;
    all: Tcli.Arg<"flag", boolean>;
    amend: Tcli.Arg<"flag", boolean>;
    no_edit: Tcli.Arg<"flag", boolean>;
    no_verify: Tcli.Arg<"flag", boolean>;
    allow_empty: Tcli.Arg<"flag", boolean>;
};
export type CommitOpts = typeof CommitOpts;
export declare const commit: Tcli.Command<{
    message: Tcli.Arg<"value", string>;
    all: Tcli.Arg<"flag", boolean>;
    amend: Tcli.Arg<"flag", boolean>;
    no_edit: Tcli.Arg<"flag", boolean>;
    no_verify: Tcli.Arg<"flag", boolean>;
    allow_empty: Tcli.Arg<"flag", boolean>;
}, string>;
declare const TagOpts: {
    message: Tcli.Arg<"value", string>;
    annotate: Tcli.Arg<"flag", boolean>;
    force: Tcli.Arg<"flag", boolean>;
    delete: Tcli.Arg<"flag", boolean>;
    list: Tcli.Arg<"flag", boolean>;
    name: Tcli.Arg<"positional", string>;
    ref: Tcli.Arg<"positional", string>;
};
export type TagOpts = typeof TagOpts;
export declare const tag: Tcli.Command<{
    message: Tcli.Arg<"value", string>;
    annotate: Tcli.Arg<"flag", boolean>;
    force: Tcli.Arg<"flag", boolean>;
    delete: Tcli.Arg<"flag", boolean>;
    list: Tcli.Arg<"flag", boolean>;
    name: Tcli.Arg<"positional", string>;
    ref: Tcli.Arg<"positional", string>;
}, string>;
declare const PushOpts: {
    force: Tcli.Arg<"flag", boolean>;
    tags: Tcli.Arg<"flag", boolean>;
    delete: Tcli.Arg<"flag", boolean>;
    set_upstream: Tcli.Arg<"flag", boolean>;
    dry_run: Tcli.Arg<"flag", boolean>;
    remote: Tcli.Arg<"positional", string>;
    refspec: Tcli.Arg<"positional", string[]>;
};
export type PushOpts = typeof PushOpts;
export declare const push: Tcli.Command<{
    force: Tcli.Arg<"flag", boolean>;
    tags: Tcli.Arg<"flag", boolean>;
    delete: Tcli.Arg<"flag", boolean>;
    set_upstream: Tcli.Arg<"flag", boolean>;
    dry_run: Tcli.Arg<"flag", boolean>;
    remote: Tcli.Arg<"positional", string>;
    refspec: Tcli.Arg<"positional", string[]>;
}, string>;
declare const FetchOpts: {
    all: Tcli.Arg<"flag", boolean>;
    prune: Tcli.Arg<"flag", boolean>;
    tags: Tcli.Arg<"flag", boolean>;
    depth: Tcli.Arg<"value", number>;
    remote: Tcli.Arg<"positional", string>;
    refspec: Tcli.Arg<"positional", string[]>;
};
export type FetchOpts = typeof FetchOpts;
export declare const fetch: Tcli.Command<{
    all: Tcli.Arg<"flag", boolean>;
    prune: Tcli.Arg<"flag", boolean>;
    tags: Tcli.Arg<"flag", boolean>;
    depth: Tcli.Arg<"value", number>;
    remote: Tcli.Arg<"positional", string>;
    refspec: Tcli.Arg<"positional", string[]>;
}, string>;
declare const BranchOpts: {
    list: Tcli.Arg<"flag", boolean>;
    force: Tcli.Arg<"flag", boolean>;
    delete: Tcli.Arg<"flag", boolean>;
    move: Tcli.Arg<"flag", boolean>;
    name: Tcli.Arg<"positional", string>;
    start: Tcli.Arg<"positional", string>;
};
export type BranchOpts = typeof BranchOpts;
export declare const branch: Tcli.Command<{
    list: Tcli.Arg<"flag", boolean>;
    force: Tcli.Arg<"flag", boolean>;
    delete: Tcli.Arg<"flag", boolean>;
    move: Tcli.Arg<"flag", boolean>;
    name: Tcli.Arg<"positional", string>;
    start: Tcli.Arg<"positional", string>;
}, string>;
declare const CheckoutOpts: {
    create: Tcli.Arg<"value", string>;
    force: Tcli.Arg<"flag", boolean>;
    detach: Tcli.Arg<"flag", boolean>;
    ref: Tcli.Arg<"positional", string>;
};
export type CheckoutOpts = typeof CheckoutOpts;
export declare const checkout: Tcli.Command<{
    create: Tcli.Arg<"value", string>;
    force: Tcli.Arg<"flag", boolean>;
    detach: Tcli.Arg<"flag", boolean>;
    ref: Tcli.Arg<"positional", string>;
}, string>;
declare const StatusOpts: {
    porcelain: Tcli.Arg<"flag", boolean>;
    short: Tcli.Arg<"flag", boolean>;
    branch: Tcli.Arg<"flag", boolean>;
    pathspec: Tcli.Arg<"positional", string[]>;
};
export type StatusOpts = typeof StatusOpts;
export declare const status: Tcli.Command<{
    porcelain: Tcli.Arg<"flag", boolean>;
    short: Tcli.Arg<"flag", boolean>;
    branch: Tcli.Arg<"flag", boolean>;
    pathspec: Tcli.Arg<"positional", string[]>;
}, string>;
declare const DiffOpts: {
    cached: Tcli.Arg<"flag", boolean>;
    name_only: Tcli.Arg<"flag", boolean>;
    stat: Tcli.Arg<"flag", boolean>;
    ref: Tcli.Arg<"positional", string>;
    pathspec: Tcli.Arg<"positional", string[]>;
};
export type DiffOpts = typeof DiffOpts;
export declare const diff: Tcli.Command<{
    cached: Tcli.Arg<"flag", boolean>;
    name_only: Tcli.Arg<"flag", boolean>;
    stat: Tcli.Arg<"flag", boolean>;
    ref: Tcli.Arg<"positional", string>;
    pathspec: Tcli.Arg<"positional", string[]>;
}, string>;
declare const RevParseOpts: {
    verify: Tcli.Arg<"flag", boolean>;
    quiet: Tcli.Arg<"flag", boolean>;
    short: Tcli.Arg<"flag", boolean>;
    abbrev_ref: Tcli.Arg<"flag", boolean>;
    show_toplevel: Tcli.Arg<"flag", boolean>;
    git_dir: Tcli.Arg<"flag", boolean>;
    ref: Tcli.Arg<"positional", string>;
};
export type RevParseOpts = typeof RevParseOpts;
export declare const rev_parse: Tcli.Command<{
    verify: Tcli.Arg<"flag", boolean>;
    quiet: Tcli.Arg<"flag", boolean>;
    short: Tcli.Arg<"flag", boolean>;
    abbrev_ref: Tcli.Arg<"flag", boolean>;
    show_toplevel: Tcli.Arg<"flag", boolean>;
    git_dir: Tcli.Arg<"flag", boolean>;
    ref: Tcli.Arg<"positional", string>;
}, string>;
declare const CloneOpts: {
    depth: Tcli.Arg<"value", number>;
    branch: Tcli.Arg<"value", string>;
    single_branch: Tcli.Arg<"flag", boolean>;
    bare: Tcli.Arg<"flag", boolean>;
    url: Tcli.Arg<"positional", string>;
    dir: Tcli.Arg<"positional", string>;
};
export type CloneOpts = typeof CloneOpts;
export declare const clone: Tcli.Command<{
    depth: Tcli.Arg<"value", number>;
    branch: Tcli.Arg<"value", string>;
    single_branch: Tcli.Arg<"flag", boolean>;
    bare: Tcli.Arg<"flag", boolean>;
    url: Tcli.Arg<"positional", string>;
    dir: Tcli.Arg<"positional", string>;
}, string>;
export {};
