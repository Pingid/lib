import path from 'node:path'
import fs from 'node:fs'

export const root = (...p: string[]) => path.join(import.meta.dirname, '..', ...p)

export const tsconfig = (name: string) => root('workspace/tsconfig', `tsconfig.${name}.json`)

/** Package-relative path to a build artefact. Export targets must keep the leading `./`. */
export const out = (...p: string[]) => `./${path.posix.join(...p)}`

/**
 * Lifts a repo-relative path out of the source tree: `lib/<pkg>/src/x` becomes `<pkg>/x` and
 * `src/x` becomes `x`, so the published layout mirrors the subpaths instead of the checkout.
 *
 * Every package is rewritten by a uniform prefix swap, which leaves relative distances between
 * its modules untouched — specifiers keep resolving without being rewritten.
 */
export const hoist = (rel: string) => rel.replace(/^lib\/([^/]+)\/src\//, '$1/').replace(/^src\//, '')

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

export const packages = () =>
  fs.promises.readdir(root('lib')).then((x) => x.map((name) => ({ name, path: path.join('lib', name) })))

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

/** Resolves `@pingid/lib/<name>` to workspace sources so the bundle inlines them. */
export const aliases = async () =>
  (await packages()).map((y) => ({ find: `@pingid/lib/${y.name}`, replacement: root(y.path, 'src/index.ts') }))

const exported = async ({ name, path: dir }: { name: string; path: string }) => {
  const exports: Record<string, string> = (await json(root(dir, 'package.json'))).exports ?? {}
  const under = (sub: string) => (sub === '.' ? `./${name}` : `./${name}/${sub.slice(2)}`)

  const out: Entry[] = []
  for (const [sub, target] of Object.entries(exports)) {
    if (!sub.includes('*')) out.push(entry(under(sub), root(dir, target)))
    else for (const [star, file] of await expand(root(dir), target)) out.push(entry(under(sub.replace('*', star)), file))
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
