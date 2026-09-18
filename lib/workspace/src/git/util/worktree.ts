import { realpath, rm } from 'node:fs/promises'
import path from 'node:path'

import { Shell } from '../../util/index.ts'

export type CreateWorkTree = {
  /** The repository the worktree is attached to. Every git command runs here. */
  cwd: string
  /** Where the branch starts from when it has to be created. */
  base: string
  branch: string
  /** Where to check it out. Relative paths resolve against `cwd`. Defaults to `.worktrees/<branch>`. */
  path?: string
  /** Clear a stale registration or leftover directory first. */
  force?: boolean
}

/** One entry of `git worktree list`. */
export type WorkTreeEntry = {
  path: string
  head?: string
  /** Short branch name, absent when the worktree is detached. */
  branch?: string
  bare: boolean
  detached: boolean
  locked: boolean
  prunable: boolean
}

/**
 * Check `branch` out into its own directory, creating the branch from `base` if it is new.
 *
 * Returns the resolved path: git records a worktree by its real path, so anything derived
 * from a symlinked one (`/tmp` on macOS) would not match what `git worktree list` reports.
 */
export const create_work_tree = async (opts: CreateWorkTree): Promise<string> => {
  const dir = path.resolve(opts.cwd, opts.path ?? path.join('.worktrees', slug(opts.branch)))

  // A stale registration or a leftover directory both make `worktree add` fail, and a
  // half-removed directory is worse than useless: git commands run there resolve up to the
  // parent repo and quietly operate on the wrong checkout.
  if (opts.force) {
    await remove_work_tree(dir, { cwd: opts.cwd, force: true }).catch(() => {})
    await rm(dir, { recursive: true, force: true })
    await Shell.run('git', ['worktree', 'prune'], { cwd: opts.cwd })
  }

  const exists = await Shell.ok('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${opts.branch}`], {
    cwd: opts.cwd,
  })
  if (!exists) await Shell.sho('git', ['branch', opts.branch, opts.base], { cwd: opts.cwd })

  await Shell.sho('git', ['worktree', 'add', dir, opts.branch], { cwd: opts.cwd })

  return realpath(dir)
}

export const remove_work_tree = async (dir: string, opts: { cwd?: string; force?: boolean } = {}): Promise<void> => {
  await Shell.sho('git', ['worktree', 'remove', dir, ...(opts.force ? ['--force'] : [])], { cwd: opts.cwd })
}

/** The worktrees attached to the repository at `cwd`, the first being the main one. */
export const list_work_trees = async (cwd?: string): Promise<WorkTreeEntry[]> => {
  const out = await Shell.sho('git', ['worktree', 'list', '--porcelain'], { cwd })
  return out
    .split(/\n\s*\n/)
    .map(parse_work_tree)
    .filter((x) => x !== undefined)
}

/** Records are `key value` lines, with bare keys for the boolean states. */
const parse_work_tree = (block: string): WorkTreeEntry | undefined => {
  const fields = new Map<string, string>()
  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const at = trimmed.indexOf(' ')
    if (at === -1) fields.set(trimmed, '')
    else fields.set(trimmed.slice(0, at), trimmed.slice(at + 1))
  }

  const dir = fields.get('worktree')
  if (!dir) return undefined
  const branch = fields.get('branch')

  return {
    path: dir,
    head: fields.get('HEAD'),
    branch: branch?.replace(/^refs\/heads\//, ''),
    bare: fields.has('bare'),
    detached: fields.has('detached'),
    locked: fields.has('locked'),
    prunable: fields.has('prunable'),
  }
}

/** Branch names may contain `/`, which would otherwise nest the default directory. */
const slug = (branch: string) => branch.replace(/[^\w.-]+/g, '-')
