import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'

import { Shell } from '../util/index.ts'
import { Repo, WorkTree } from './repo.ts'

/**
 * These run real git against a throwaway repository: the bugs worth catching here are the
 * ones where a command is well-formed but lands in the wrong directory, which only a real
 * checkout can show.
 */
let dir: string
let repo: Repo

const git = (args: string[], cwd = dir) => Shell.sho('git', args, { cwd })
const write = (name: string, body: string, cwd = dir) => writeFile(path.join(cwd, name), body)

beforeAll(async () => {
  // Isolate from the developer's own git and CI configuration: both would otherwise decide
  // the author, the signing policy and — via GITHUB_REPOSITORY — the answer under test.
  vi.stubEnv('GIT_CONFIG_GLOBAL', '/dev/null')
  vi.stubEnv('GIT_CONFIG_SYSTEM', '/dev/null')
  vi.stubEnv('GIT_AUTHOR_NAME', 'Test')
  vi.stubEnv('GIT_AUTHOR_EMAIL', 'test@example.com')
  vi.stubEnv('GIT_COMMITTER_NAME', 'Test')
  vi.stubEnv('GIT_COMMITTER_EMAIL', 'test@example.com')
  for (const name of ['GITHUB_REPOSITORY', 'GH_REPO', 'GITHUB_SHA', 'GITHUB_SERVER_URL']) vi.stubEnv(name, '')
})

afterAll(() => vi.unstubAllEnvs())

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'repo-'))
  await git(['init', '-b', 'main'])
  await git(['remote', 'add', 'origin', 'git@github.com:Pingid/lib.git'])
  await write('README.md', 'one\n')
  await git(['add', '-A'])
  await git(['commit', '-m', 'initial'])
  repo = await Repo.discover({ dir })

  return async () => {
    await rm(dir, { recursive: true, force: true })
  }
})

test('discover reads the name from origin and pins the current commit', async () => {
  expect(repo.owner).toBe('Pingid')
  expect(repo.repo).toBe('lib')
  expect(repo.name).toBe('Pingid/lib')
  expect(repo.ref).toBe(await git(['rev-parse', 'HEAD']))
})

test('discover from a subdirectory reports the working tree root, not the .git directory', async () => {
  const nested = path.join(dir, 'a', 'b')
  await mkdir(nested, { recursive: true })
  const found = await Repo.discover({ dir: nested })
  expect(found.dir).toBe(repo.dir)
  expect(found.dir).not.toContain('.git')
})

test('discover refuses a directory that is not a repository', async () => {
  const plain = await mkdtemp(path.join(tmpdir(), 'plain-'))
  await expect(Repo.discover({ dir: plain })).rejects.toThrow('Not a git repository')
  await rm(plain, { recursive: true, force: true })
})

test('commands run in the repository, not in the process directory', async () => {
  await write('README.md', 'two\n')
  await repo.add()
  await repo.commit('second')

  expect(await git(['log', '-1', '--pretty=%s'])).toBe('second')
  expect(await repo.head()).not.toBe(repo.ref)
})

test('chained options reach git, and none of them leak the cwd', async () => {
  await write('README.md', 'two\n')
  await repo.add('README.md')
  await repo.commit('second').no_verify()
  await repo.commit('amended').amend().no_edit()

  expect(await git(['log', '--pretty=%s'])).toBe('amended\ninitial')
})

test('add stages what it is given, and everything when given nothing', async () => {
  await write('a.txt', 'a')
  await write('b.txt', 'b')

  await repo.add('a.txt')
  expect(await git(['diff', '--cached', '--name-only'])).toBe('a.txt')

  await repo.add()
  expect(await git(['diff', '--cached', '--name-only'])).toBe('a.txt\nb.txt')
})

test('tags are created and listed, and a filter narrows them', async () => {
  await repo.tag('build-1')
  await repo.tag('build-2')
  await repo.tag('v1.0.0')

  expect(await repo.tags()).toEqual(['build-1', 'build-2', 'v1.0.0'])
  expect(await repo.tags('build-*')).toEqual(['build-1', 'build-2'])
})

test('has distinguishes a ref that exists from one that does not', async () => {
  await repo.tag('v1')
  await expect(repo.has('v1')).resolves.toBe(true)
  await expect(repo.has('refs/heads/main')).resolves.toBe(true)
  await expect(repo.has('nope')).resolves.toBe(false)
})

test('dirty and staged answer separately for an untracked and a staged change', async () => {
  await expect(repo.dirty()).resolves.toBe(false)
  await expect(repo.staged()).resolves.toBe(false)

  await write('c.txt', 'c')
  await expect(repo.dirty()).resolves.toBe(true)
  await expect(repo.staged()).resolves.toBe(false)

  await repo.add()
  await expect(repo.staged()).resolves.toBe(true)
})

test('branches and the current branch are reported by name', async () => {
  await repo.branch('topic')
  expect(await repo.branches()).toEqual(['main', 'topic'])
  expect(await repo.current_branch()).toBe('main')
})

test('origin prefers the checkout remote and falls back to the canonical URL', async () => {
  await expect(repo.origin()).resolves.toBe('git@github.com:Pingid/lib.git')

  const other = await Repo.discover({ dir, owner: 'Other', repo: 'thing' })
  await expect(other.origin()).resolves.toBe('https://github.com/Other/thing.git')
})

test('a worktree is a second checkout on its own branch, created from the base ref', async () => {
  const at = path.join(dir, '..', `${path.basename(dir)}-tree`)
  const tree = await repo.worktree('pkg', { path: at })

  expect(tree.dir).toBe(await realpath(at))
  expect(tree.base).toBe(repo)
  expect(tree.ref).toBe('pkg')
  expect(await tree.current_branch()).toBe('pkg')
  expect(await tree.head()).toBe(repo.ref)

  await write('built.txt', 'artifact', tree.dir)
  await tree.add()
  await tree.commit('build')

  // The commit belongs to the worktree's branch alone.
  expect(await git(['log', '-1', '--pretty=%s', 'pkg'])).toBe('build')
  expect(await git(['log', '-1', '--pretty=%s', 'main'])).toBe('initial')

  await tree.remove()
})

test('a worktree defaults to a directory named after its branch inside the repo', async () => {
  const tree = await repo.worktree('feature/x')
  expect(tree.dir).toBe(path.join(repo.dir, '.worktrees', 'feature-x'))
  await tree.remove()
})

test('creating a worktree twice reuses the branch and clears the stale checkout', async () => {
  const at = path.join(dir, '..', `${path.basename(dir)}-twice`)
  const first = await repo.worktree('pkg', { path: at })
  await write('built.txt', 'artifact', first.dir)
  await first.add()
  await first.commit('build')

  const second = await repo.worktree('pkg', { path: at })
  expect(await second.current_branch()).toBe('pkg')
  expect(await second.head()).toBe(await first.head())

  await second.remove()
})

test('worktrees lists the main checkout first, and removal deregisters it', async () => {
  const at = path.join(dir, '..', `${path.basename(dir)}-list`)
  const tree = await repo.worktree('pkg', { path: at })

  const listed = await repo.worktrees()
  expect(listed.map((w) => w.branch)).toEqual(['main', 'pkg'])
  expect(listed[0]?.path).toBe(repo.dir)
  expect(listed[1]).toMatchObject({ path: tree.dir, bare: false, detached: false })

  await tree.remove()
  expect(await repo.worktrees()).toHaveLength(1)
})

test('a worktree cleans itself up at the end of an await using block', async () => {
  const at = path.join(dir, '..', `${path.basename(dir)}-dispose`)
  let inner: WorkTree | undefined

  {
    await using tree = await repo.worktree('pkg', { path: at })
    inner = tree
    expect(tree.dir).toBe(await realpath(at))
    expect(await repo.worktrees()).toHaveLength(2)
  }

  expect(await repo.worktrees()).toHaveLength(1)
  expect(existsSync(inner.dir)).toBe(false)
})

test('a failing command reports what git said', async () => {
  await expect(repo.commit('nothing to do')).rejects.toThrow(/nothing to commit/i)
})
