import { Shell, env } from '../../util/index.ts'

/** The pieces of a remote: who owns it, what it is called, and where it lives. */
export type Origin = { owner: string; repo: string; origin: string }

/**
 * The token to authenticate with, from the environment or from a signed-in `gh`.
 * Throws rather than returning an empty string, since every caller needs a real one.
 */
export const discover_token = async (): Promise<string> => {
  const token = env('GITHUB_TOKEN') || env('GH_TOKEN') || (await Shell.sho('gh', ['auth', 'token']).catch(() => ''))
  if (!token) throw new Error('GitHub token not found. Set GITHUB_TOKEN or run `gh auth login`.')
  return token
}

/**
 * Work out which repository `cwd` belongs to: what CI says, else the `origin` remote,
 * else whatever `gh` believes. Returns `undefined` when none of them can answer, leaving
 * the decision of how loudly to fail to the caller.
 */
export const discover_name = async (cwd?: string): Promise<Origin | undefined> => {
  const e = env('GITHUB_REPOSITORY') || env('GH_REPO')
  if (e) return parse_origin(e)

  const remote = await Shell.sho('git', ['remote', 'get-url', 'origin'], { cwd }).catch(() => undefined)
  const parsed = remote ? parse_origin(remote) : undefined
  if (parsed) return parsed

  const gh = await Shell.sho('gh', ['repo', 'view', '--json', 'nameWithOwner'], { cwd }).catch(() => undefined)
  if (!gh) return undefined
  try {
    return parse_origin(JSON.parse(gh).nameWithOwner)
  } catch {
    return undefined
  }
}

/**
 * The URL to push to for `owner/repo`. Prefers the checkout's own `origin`, so a fork, a
 * mirror or an SSH remote is kept, and only falls back to the canonical URL when `origin`
 * points somewhere else entirely.
 */
export const origin_of = async (owner: string, repo: string, cwd?: string): Promise<string> => {
  const remote = await Shell.sho('git', ['remote', 'get-url', 'origin'], { cwd }).catch(() => undefined)
  const parsed = remote ? parse_origin(remote) : undefined
  if (parsed?.owner === owner && parsed.repo === repo) return parsed.origin
  return default_origin(owner, repo)
}

/** The canonical URL for `owner/repo` on the configured server. */
export const default_origin = (owner: string, repo: string): string =>
  `${(env('GITHUB_SERVER_URL') || 'https://github.com').replace(/\/+$/, '')}/${owner}/${repo}.git`

/**
 * Parse anything that names a repository: `owner/repo`, `https://host/owner/repo.git`,
 * `git@host:owner/repo`, `ssh://git@host:2222/owner/repo.git`.
 *
 * The owner is the segment before the repository, so a nested group (`group/sub/repo`)
 * reports `sub` — which is what the GitHub-shaped APIs this is fed to expect.
 */
export const parse_origin = (url: string): Origin | undefined => {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) return undefined

  // `owner/repo`, the shorthand GITHUB_REPOSITORY and `gh` use. Anything carrying a scheme
  // or userinfo is a URL, even when it happens to have two segments.
  if (!/:\/\/|@/.test(trimmed)) {
    const short = trimmed.match(/^([^/\s:]+)\/([^/\s:]+?)(?:\.git)?$/)
    if (short) return { owner: short[1]!, repo: short[2]!, origin: default_origin(short[1]!, short[2]!) }
  }

  const url_ = trimmed.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/]+@)?[^/:]+(?::\d+)?[:/](.+?)(?:\.git)?$/i)
  if (!url_) return undefined

  const parts = url_[1]!.split('/').filter(Boolean)
  const repo = parts.pop()
  const owner = parts.pop()
  if (!owner || !repo) return undefined
  return { owner, repo, origin: trimmed }
}
