import { Shell, ShellError, env } from '../util/index.ts'

import * as util from './util/index.ts'
import * as cmd from './cmd.ts'

/**
 * A git working directory. Every command is bound to `dir`, so nothing here can quietly act
 * on whichever repository the process happens to be sitting in.
 */
export class Git {
  /** The token to authenticate remotes with. Environment-derived, so it is not per-checkout. */
  static token = (): Promise<string> => util.discover_token()

  public readonly dir: string
  constructor(dir: string) {
    this.dir = dir
  }

  // ---------------- Commands --------------------------
  // Each returns a lazy builder: nothing runs until it is awaited, and further options can
  // be chained on first — `repo.commit('wip').amend().no_edit()`.

  /** Stage `pathspec`, or everything when none is given. */
  add = (...pathspec: string[]) =>
    pathspec.length ? cmd.add({ cwd: this.dir, pathspec }) : cmd.add({ cwd: this.dir, all: true })
  commit = (message?: string) => cmd.commit({ cwd: this.dir, message })
  tag = (name?: string, ref?: string) => cmd.tag({ cwd: this.dir, name, ref })
  push = (remote?: string, ...refspec: string[]) => cmd.push({ cwd: this.dir, remote, refspec })
  fetch = (remote?: string, ...refspec: string[]) => cmd.fetch({ cwd: this.dir, remote, refspec })
  branch = (name?: string, start?: string) => cmd.branch({ cwd: this.dir, name, start })
  checkout = (ref?: string) => cmd.checkout({ cwd: this.dir, ref })
  status = () => cmd.status({ cwd: this.dir })
  diff = (ref?: string) => cmd.diff({ cwd: this.dir, ref })
  rev_parse = (ref?: string) => cmd.rev_parse({ cwd: this.dir, ref })

  /** Escape hatch for anything without a recipe. Resolves with trimmed stdout. */
  git = (...args: string[]): Promise<string> => Shell.sho('git', args, { cwd: this.dir })

  // ---------------- Queries --------------------------

  /** The absolute path of the working tree root, which `dir` may be a subdirectory of. */
  root = (): Promise<string> => this.git('rev-parse', '--show-toplevel')

  /** The commit a ref resolves to. */
  head = (ref: string = 'HEAD'): Promise<string> => this.git('rev-parse', ref)

  /** The checked-out branch, or `HEAD` when detached. */
  current_branch = (): Promise<string> => this.git('rev-parse', '--abbrev-ref', 'HEAD')

  /** Tag names, optionally narrowed by a glob such as `build-*`. */
  tags = (filter?: string): Promise<string[]> => this.git('tag', '--list', ...(filter ? [filter] : [])).then(lines)

  /** Local branch names. */
  branches = (): Promise<string[]> => this.git('for-each-ref', '--format=%(refname:short)', 'refs/heads').then(lines)

  /** Whether a ref exists and resolves. */
  has = (ref: string): Promise<boolean> => Shell.ok('git', ['rev-parse', '--verify', '--quiet', ref], { cwd: this.dir })

  /** Whether the working tree has any change at all, staged or not, tracked or not. */
  dirty = (): Promise<boolean> => this.git('status', '--porcelain').then((out) => out.length > 0)

  /** Whether anything is staged — the question `git diff --cached --quiet` answers by exit code. */
  staged = async (): Promise<boolean> => {
    const r = await Shell.run('git', ['diff', '--cached', '--quiet'], { cwd: this.dir })
    if (r.code === 0) return false
    if (r.code === 1) return true
    throw new ShellError(r)
  }

  /** The URL of a remote, `origin` by default. */
  remote_url = (name: string = 'origin'): Promise<string> => this.git('remote', 'get-url', name)

  /** Every worktree attached to this repository, the main one first. */
  worktrees = (): Promise<util.WorkTreeEntry[]> => util.list_work_trees(this.dir)
}

const lines = (out: string) =>
  out
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

/** A checkout that also knows which remote repository it is, and at what commit. */
export class Repo extends Git {
  /**
   * Identify the repository containing `dir` (the process directory by default), taking the
   * name from CI, the `origin` remote or `gh`, in that order. Anything passed explicitly wins.
   */
  static async discover(p: { owner?: string; repo?: string; ref?: string; dir?: string } = {}): Promise<Repo> {
    const from = p.dir ?? process.cwd()
    const dir = await Shell.sho('git', ['rev-parse', '--show-toplevel'], { cwd: from }).catch(() => undefined)
    if (!dir) throw new Error(`Not a git repository: ${from}`)

    const named = p.owner && p.repo ? undefined : await util.discover_name(dir)
    const owner = p.owner || named?.owner
    const repo = p.repo || named?.repo
    if (!owner || !repo) {
      throw new Error('Could not determine GitHub owner/repo. Set GITHUB_REPOSITORY or add an `origin` remote.')
    }

    const ref = p.ref || env('GITHUB_SHA') || (await Shell.sho('git', ['rev-parse', 'HEAD'], { cwd: dir }))
    return new Repo(owner, repo, ref, dir)
  }

  public readonly owner: string
  public readonly repo: string
  /** The commit (or branch, for a worktree) this instance stands for. */
  public readonly ref: string

  constructor(owner: string, repo: string, ref: string, dir: string) {
    super(dir)
    this.owner = owner
    this.repo = repo
    this.ref = ref
  }

  /** `owner/repo`. */
  get name(): string {
    return `${this.owner}/${this.repo}`
  }

  /** The URL to push to: this checkout's `origin` when it matches, else the canonical one. */
  origin(): Promise<string> {
    return util.origin_of(this.owner, this.repo, this.dir)
  }

  /** Check `branch` out into its own directory, branching from this ref if it is new. */
  worktree(branch: string, opts: { path?: string; force?: boolean } = {}): Promise<WorkTree> {
    return WorkTree.create(this, branch, opts)
  }
}

/**
 * A second checkout of the same repository on another branch, so a build can be committed
 * without disturbing the tree you are working in.
 */
export class WorkTree extends Repo {
  public readonly base: Repo

  static async create(base: Repo, branch: string, opts: { path?: string; force?: boolean } = {}): Promise<WorkTree> {
    const dir = await util.create_work_tree({
      cwd: base.dir,
      base: base.ref,
      branch,
      path: opts.path,
      force: opts.force ?? true,
    })
    return new WorkTree(base, new Repo(base.owner, base.repo, branch, dir))
  }

  constructor(base: Repo, tree: Repo) {
    super(tree.owner, tree.repo, tree.ref, tree.dir)
    this.base = base
  }

  /** Detach the worktree and delete its directory. The branch itself is kept. */
  async remove(force: boolean = true): Promise<void> {
    await util.remove_work_tree(this.dir, { cwd: this.base.dir, force })
  }

  /** `await using tree = await repo.worktree('pkg')` cleans up however the block exits. */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.remove()
  }
}
