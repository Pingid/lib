import path from 'node:path'
import fs from 'node:fs'

export const root = (...p: string[]) => path.join(import.meta.dirname, '../..', ...p)

export const tsconfig = (name: string) => root('workspace/tsconfig', `tsconfig.${name}.json`)

/** Package-relative path to a build artefact. Export targets must keep the leading `./`. */
export const out = (...p: string[]) => `./${path.posix.join(...p)}`

/**
 * Lifts a repo-relative path out of the source tree: `lib/<pkg>/src/x` becomes `<pkg>/x` and
 * `src/x` becomes `x`, so the published layout mirrors the subpaths instead of the checkout.
 *
 * A package's `src` is optional in the match so that anything it publishes from outside that
 * directory — a `bin` under `lib/<pkg>/cli/`, say — still lands under the package rather than
 * dragging `lib/` into the output. Rolldown rewrites relative specifiers against the emitted
 * file names, so the levels a module gains or loses here cost nothing.
 */
export const hoist = (rel: string) => rel.replace(/^lib\/([^/]+)\/(?:src\/)?/, '$1/').replace(/^src\//, '')

/** Output path of a source module, relative to the package root and without an extension. */
export const flat = (file: string) => hoist(relative(file)).replace(/\.(d\.ts|ts)$/, '')

const relative = (p: string) => path.relative(root(), p).split(path.sep).join('/')

/** A public entry point of the published package. */
export type Entry = {
  /** What consumers import, e.g. `.` or `./vite/plugin/iife`. */
  subpath: string
  /** Absolute path of the source module. */
  file: string
  /** Where its artefacts land in the package, without an extension. */
  name: string
  /** Set when the source is a `.d.ts`: types only, nothing to bundle. */
  types: boolean
}

/** A workspace package: its directory name under `lib/`, and the repo-relative path to it. */
export type Package = { name: string; path: string }

/**
 * The workspace packages, which is every directory under `lib/` carrying a manifest.
 *
 * A directory without one is not a package — a leftover checkout or a half-started library —
 * and reading it as though it were would only fail the build for something unpublishable.
 */
export const packages = async (): Promise<Package[]> => {
  const found = await fs.promises.readdir(root('lib'), { withFileTypes: true })
  const dirs = found.filter((f) => f.isDirectory()).map((f) => ({ name: f.name, path: path.join('lib', f.name) }))
  const has = await Promise.all(dirs.map((d) => exists(root(d.path, 'package.json'))))

  return dirs.filter((_, i) => has[i])
}

const exists = (p: string) =>
  fs.promises
    .access(p)
    .then(() => true)
    .catch(() => false)

/**
 * The published surface: the root entry, plus every subpath each workspace package declares in
 * its own `exports`, namespaced under the package directory.
 *
 * So `lib/vite` exporting `./plugin/*` becomes `@pingid/lib/vite/plugin/iife` and its siblings.
 * Keeping each package's `exports` as the source of truth means adding one there is the whole
 * change — nothing here needs to know which packages exist.
 */
export const entries = async (): Promise<Entry[]> => {
  const libs = await Promise.all((await packages()).map(exported))
  return [entry('.', root('src/index.ts')), ...libs.flat()]
}

/** A command the published package installs, taken from a workspace package's own `bin`. */
export type Bin = {
  /** The name the command is installed under, e.g. `ship`. */
  command: string
  /** Absolute path of the source module. */
  file: string
  /** Where its artefacts land in the package, without an extension. */
  name: string
}

/**
 * Every command the workspace declares, namespaced by nothing: a bin name is global once
 * installed, so the two packages claiming one have to be told apart here rather than by npm
 * silently letting the later link win.
 *
 * As with `exports`, each package's own `bin` is the source of truth — declaring one there is
 * the whole change.
 */
export const bins = async (): Promise<Bin[]> => {
  const found = (await Promise.all((await packages()).map(binned))).flat()

  const seen = new Map<string, string>()
  for (const b of found) {
    const first = seen.get(b.command)
    if (first) throw new Error(`Two packages declare the bin "${b.command}": ${first} and ${b.file}`)
    seen.set(b.command, b.file)
  }

  return found.sort((a, b) => a.command.localeCompare(b.command))
}

/**
 * npm's shorthand `"bin": "./cli.ts"` installs the command under the package's own name, which
 * here would be the whole monorepo. The directory is the only meaningful name left, so it
 * stands in; the object form already says what it wants.
 */
const binned = async ({ name, path: dir }: Package): Promise<Bin[]> => {
  const declared: string | Record<string, string> | undefined = (await json(root(dir, 'package.json'))).bin
  if (!declared) return []
  const all = typeof declared === 'string' ? { [name]: declared } : declared

  return Object.entries(all).map(([command, target]) => ({
    command,
    file: root(dir, target),
    name: flat(root(dir, target)),
  }))
}

/** Resolves `@pingid/lib/<name>` to workspace sources so the bundle inlines them. */
export const aliases = async () =>
  (await packages()).map((y) => ({ find: `@pingid/lib/${y.name}`, replacement: root(y.path, 'src/index.ts') }))

const exported = async ({ name, path: dir }: Package) => {
  const exports: Record<string, string> = (await json(root(dir, 'package.json'))).exports ?? {}
  const under = (sub: string) => (sub === '.' ? `./${name}` : `./${name}/${sub.slice(2)}`)

  const out: Entry[] = []
  for (const [sub, target] of Object.entries(exports)) {
    if (!sub.includes('*')) out.push(entry(under(sub), root(dir, target)))
    else
      for (const [star, file] of await expand(root(dir), target)) out.push(entry(under(sub.replace('*', star)), file))
  }
  return out
}

const entry = (subpath: string, file: string): Entry => ({
  subpath,
  file,
  name: flat(file),
  types: file.endsWith('.d.ts'),
})

/**
 * Expands a wildcard export target, pairing each match with the text the star stood for.
 *
 * A target of `./src/<star>/plugin.ts` yields `iife`, `server`, `virtual`. Only the directory
 * before the star is read, so a sibling `examples` or `node_modules` is never traversed.
 */
const expand = async (dir: string, target: string) => {
  const [before = '', after = ''] = target.split('*')
  const base = before.slice(0, before.lastIndexOf('/') + 1)
  const found = await fs.promises.readdir(path.join(dir, base), { recursive: true })

  return found
    .map((f) => base + f.split(path.sep).join('/'))
    .filter((f) => f.startsWith(before) && f.endsWith(after) && f.length > before.length + after.length)
    .map((f) => [f.slice(before.length, f.length - after.length), path.join(dir, f)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
}

const json = (p: string) => fs.promises.readFile(p, 'utf8').then(JSON.parse)

export const dependBuilder = () => {
  const all = new Map<string, string>()

  const add = (name: string, version: string) => {
    const current = all.get(name)
    if (current && current !== version) {
      throw new Error(`Dependency ${name} has different versions: ${current} and ${version}`)
    }
    all.set(name, version)
  }

  const extend = (deps?: Record<string, string>) => {
    for (const [name, version] of Object.entries(deps ?? {})) add(name, version)
  }

  const out = () => Object.fromEntries(all)

  return { add, extend, out }
}
