import { spawn } from 'node:child_process'
import path from 'node:path'

export class Repo {
  static async discover(p: { owner?: string; repo?: string; ref?: string } = {}) {
    const d = p.owner && p.repo ? undefined : await discover_name()
    const owner = p.owner || d?.owner
    const repo = p.repo || d?.repo
    if (!owner || !repo) throw new Error('Could not determine GitHub owner/repo')
    const ref = p.ref || env('GITHUB_SHA') || (await sh('git', ['rev-parse', 'HEAD']))
    return new Repo(owner, repo, ref)
  }

  public readonly owner: string
  public readonly repo: string
  public readonly ref: string
  constructor(owner: string, repo: string, ref: string) {
    this.owner = owner
    this.repo = repo
    this.ref = ref
  }

  async token(): Promise<string> {
    return discover_token()
  }

  async origin(): Promise<string> {
    return origin_of(this.owner, this.repo)
  }
}

export class WorkTree extends Repo {
  public readonly base: Repo
  public readonly path: string

  static async create(base: Repo, branch: string, path?: string) {
    const pth = await create_work_tree({ base: base.ref, branch, path, force: true })
    return new WorkTree(base, new Repo(base.owner, base.repo, branch), pth)
  }

  // static async create(base: Repo, ) {
  constructor(base: Repo, tree: Repo, path: string) {
    super(tree.owner, tree.repo, tree.ref)
    this.base = base
    this.path = path
  }

  async remove(force: boolean = true) {
    await remove_work_tree(this.path, force)
  }
}

const create_work_tree = async (opts: { base: string; branch: string; path?: string; force?: boolean }) => {
  const pth = opts.path || root('.worktrees', opts.branch)

  if (opts.force) await remove_work_tree(pth, true).catch(() => {})

  // Check if branch exists
  try {
    await sh('git', ['rev-parse', '--verify', opts.branch])
    console.log('Branch exists')
  } catch (e) {
    console.log('Branch does not exist, creating it')
    await sh('git', ['branch', '-b', opts.branch, opts.base])
  }

  await sh('git', ['worktree', 'add', pth, opts.branch])

  return pth
}

const root = (...parts: string[]) => path.join(env('GITHUB_WORKSPACE') || process.cwd(), ...parts)

const remove_work_tree = async (path: string, force: boolean) => {
  await sh('git', ['worktree', 'remove', path, force ? '--force' : ''])
}
const discover_token = async (): Promise<string> => {
  const token = env('GITHUB_TOKEN') || env('GH_TOKEN') || (await sh('gh', ['auth', 'token']).catch(() => ''))
  if (!token) throw new Error('GitHub token not found. Set GITHUB_TOKEN or run `gh auth login`.')
  return token
}

const discover_name = async (): Promise<{ owner: string; repo: string } | undefined> => {
  const e = env('GITHUB_REPOSITORY') || env('GH_REPO')
  if (e) return parse_origin(e)
  try {
    return parse_origin(await sh('git', ['remote', 'get-url', 'origin']))
  } catch {
    /* fall through to gh */
  }
  return parse_origin(JSON.parse(await sh('gh', ['repo', 'view', '--json', 'nameWithOwner'])).nameWithOwner)
}

const env = (name: string) => process.env[name]

const origin_of = async (owner: string, repo: string) => {
  try {
    const parsed = parse_origin(await sh('git', ['remote', 'get-url', 'origin']))
    if (parsed?.owner === owner && parsed?.repo === repo) return parsed.origin
  } catch {
    /* fall through */
  }
  return default_origin(owner, repo)
}

const default_origin = (owner: string, repo: string) =>
  `${(env('GITHUB_SERVER_URL') || 'https://github.com').replace(/\/$/, '')}/${owner}/${repo}.git`

const parse_origin = (url: string): { owner: string; repo: string; origin: string } | undefined => {
  const origin = url.trim().replace(/\/$/, '')
  const full = origin.match(/^(?:https?:\/\/|git@|ssh:\/\/git@)([^/:]+)[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (full) return { owner: full[2]!, repo: full[3]!, origin }
  const name = origin.match(/^([^/]+)\/([^/]+)$/)
  if (name) return { owner: name[1]!, repo: name[2]!, origin: default_origin(name[1]!, name[2]!) }
  return undefined
}

/** Run `cmd` and capture its stdout. Throws with stderr on a non-zero exit. */
export const sh = async (cmd: string, args: string[], options: { cwd?: string } = {}): Promise<string> => {
  const proc = spawn(cmd, args, { stdio: 'pipe', env: process.env, ...options })
  const stdout: Buffer[] = []
  const stderr: Buffer[] = []
  proc.stdout.on('data', (data) => stdout.push(data))
  proc.stderr.on('data', (data) => stderr.push(data))

  const join = (buffers: Buffer[]) =>
    buffers
      .map((b) => b.toString('utf-8'))
      .join('')
      .trim()
  return new Promise<string>((resolve, reject) => {
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`${cmd} ${args.join(' ')} failed: ${join(stderr)}`))
      else resolve(join(stdout))
    })
    proc.on('error', (error) => reject(error))
  })
}
