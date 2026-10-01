import { Tcli } from '../tcli/index.ts'

const recipe = Tcli.cli('git')

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

const AddOpts = { all: Tcli.flag(), force: Tcli.flag(), update: Tcli.flag(), pathspec: Tcli.positional<string[]>() }
export type AddOpts = typeof AddOpts
export const add = recipe(['add'], AddOpts)

const CommitOpts = {
  message: Tcli.value(),
  all: Tcli.flag(),
  amend: Tcli.flag(),
  no_edit: Tcli.flag(),
  no_verify: Tcli.flag(),
  allow_empty: Tcli.flag(),
}
export type CommitOpts = typeof CommitOpts
export const commit = recipe(['commit'], CommitOpts)

const TagOpts = {
  message: Tcli.value(),
  annotate: Tcli.flag(),
  force: Tcli.flag(),
  delete: Tcli.flag(),
  list: Tcli.flag(),
  name: Tcli.positional(),
  ref: Tcli.positional(),
}
export type TagOpts = typeof TagOpts
export const tag = recipe(['tag'], TagOpts)

const PushOpts = {
  force: Tcli.flag(),
  tags: Tcli.flag(),
  delete: Tcli.flag(),
  set_upstream: Tcli.flag(),
  dry_run: Tcli.flag(),
  remote: Tcli.positional(),
  refspec: Tcli.positional<string[]>(),
}
export type PushOpts = typeof PushOpts
export const push = recipe(['push'], PushOpts)

const FetchOpts = {
  all: Tcli.flag(),
  prune: Tcli.flag(),
  tags: Tcli.flag(),
  depth: Tcli.value<number>(),
  remote: Tcli.positional(),
  refspec: Tcli.positional<string[]>(),
}
export type FetchOpts = typeof FetchOpts
export const fetch = recipe(['fetch'], FetchOpts)

const BranchOpts = {
  list: Tcli.flag(),
  force: Tcli.flag(),
  delete: Tcli.flag(),
  move: Tcli.flag(),
  name: Tcli.positional(),
  start: Tcli.positional(),
}
export type BranchOpts = typeof BranchOpts
export const branch = recipe(['branch'], BranchOpts)

const CheckoutOpts = { create: Tcli.value('-b'), force: Tcli.flag(), detach: Tcli.flag(), ref: Tcli.positional() }
export type CheckoutOpts = typeof CheckoutOpts
export const checkout = recipe(['checkout'], CheckoutOpts)

const StatusOpts = {
  porcelain: Tcli.flag(),
  short: Tcli.flag(),
  branch: Tcli.flag(),
  pathspec: Tcli.positional<string[]>(),
}
export type StatusOpts = typeof StatusOpts
export const status = recipe(['status'], StatusOpts)

const DiffOpts = {
  cached: Tcli.flag(),
  name_only: Tcli.flag(),
  stat: Tcli.flag(),
  ref: Tcli.positional(),
  pathspec: Tcli.positional<string[]>(),
}
export type DiffOpts = typeof DiffOpts
export const diff = recipe(['diff'], DiffOpts)

const RevParseOpts = {
  verify: Tcli.flag(),
  quiet: Tcli.flag(),
  short: Tcli.flag(),
  abbrev_ref: Tcli.flag(),
  show_toplevel: Tcli.flag(),
  git_dir: Tcli.flag(),
  ref: Tcli.positional(),
}
export type RevParseOpts = typeof RevParseOpts
export const rev_parse = recipe(['rev-parse'], RevParseOpts)

const CloneOpts = {
  depth: Tcli.value<number>(),
  branch: Tcli.value(),
  single_branch: Tcli.flag(),
  bare: Tcli.flag(),
  url: Tcli.positional(),
  dir: Tcli.positional(),
}
export type CloneOpts = typeof CloneOpts
export const clone = recipe(['clone'], CloneOpts)
