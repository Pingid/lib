import { flag, positional, recipe, value } from './util/index.ts'

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

const AddOpts = { all: flag(), force: flag(), update: flag(), pathspec: positional<string[]>() }
export type AddOpts = typeof AddOpts
export const add = recipe(['add'], AddOpts)

const CommitOpts = {
  message: value(),
  all: flag(),
  amend: flag(),
  no_edit: flag(),
  no_verify: flag(),
  allow_empty: flag(),
}
export type CommitOpts = typeof CommitOpts
export const commit = recipe(['commit'], CommitOpts)

const TagOpts = {
  message: value(),
  annotate: flag(),
  force: flag(),
  delete: flag(),
  list: flag(),
  name: positional(),
  ref: positional(),
}
export type TagOpts = typeof TagOpts
export const tag = recipe(['tag'], TagOpts)

const PushOpts = {
  force: flag(),
  tags: flag(),
  delete: flag(),
  set_upstream: flag(),
  dry_run: flag(),
  remote: positional(),
  refspec: positional<string[]>(),
}
export type PushOpts = typeof PushOpts
export const push = recipe(['push'], PushOpts)

const FetchOpts = {
  all: flag(),
  prune: flag(),
  tags: flag(),
  depth: value<number>(),
  remote: positional(),
  refspec: positional<string[]>(),
}
export type FetchOpts = typeof FetchOpts
export const fetch = recipe(['fetch'], FetchOpts)

const BranchOpts = {
  list: flag(),
  force: flag(),
  delete: flag(),
  move: flag(),
  name: positional(),
  start: positional(),
}
export type BranchOpts = typeof BranchOpts
export const branch = recipe(['branch'], BranchOpts)

const CheckoutOpts = { create: value('-b'), force: flag(), detach: flag(), ref: positional() }
export type CheckoutOpts = typeof CheckoutOpts
export const checkout = recipe(['checkout'], CheckoutOpts)

const StatusOpts = { porcelain: flag(), short: flag(), branch: flag(), pathspec: positional<string[]>() }
export type StatusOpts = typeof StatusOpts
export const status = recipe(['status'], StatusOpts)

const DiffOpts = {
  cached: flag(),
  name_only: flag(),
  stat: flag(),
  ref: positional(),
  pathspec: positional<string[]>(),
}
export type DiffOpts = typeof DiffOpts
export const diff = recipe(['diff'], DiffOpts)

const RevParseOpts = {
  verify: flag(),
  quiet: flag(),
  short: flag(),
  abbrev_ref: flag(),
  show_toplevel: flag(),
  git_dir: flag(),
  ref: positional(),
}
export type RevParseOpts = typeof RevParseOpts
export const rev_parse = recipe(['rev-parse'], RevParseOpts)

const CloneOpts = {
  depth: value<number>(),
  branch: value(),
  single_branch: flag(),
  bare: flag(),
  url: positional(),
  dir: positional(),
}
export type CloneOpts = typeof CloneOpts
export const clone = recipe(['clone'], CloneOpts)
