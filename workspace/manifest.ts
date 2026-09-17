import fs from 'node:fs'

import { root, out, packages, entries, dependBuilder, type Entry } from './util.ts'

/**
 * Emits the publishable manifest into `pkg/`, alongside the bundle written by vite.
 *
 * Static metadata is taken from the root `package.json` minus the keys that describe the repo;
 * everything that has to track the build (entry points, dependencies) is derived here so the
 * two cannot drift.
 */
export const manifest = async () => {
  const [base, list, deps, files] = await Promise.all([
    json(root('package.json')),
    entries(),
    dependencies(),
    published(),
  ])

  const main = list.find((e) => e.subpath === '.')
  if (!main) throw new Error('no root entry: expected src/index.ts')

  const pkg = {
    ...strip(base),
    main: out(`${main.name}.cjs`),
    module: out(`${main.name}.js`),
    types: out(`${main.name}.d.ts`),
    exports: Object.fromEntries(
      list.sort((a, b) => a.subpath.localeCompare(b.subpath)).map((e) => [e.subpath, conditions(e)]),
    ),
    files,
    ...deps,
  }

  await fs.promises.mkdir(root('pkg'), { recursive: true })
  await fs.promises.writeFile(root('pkg/package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
  await Promise.all(['README.md', 'LICENSE'].map(copy))
}

/**
 * Points each emitted declaration at the built output, and mirrors it as `.d.cts`.
 *
 * Two things typescript will not do for us: `rewriteRelativeImportExtensions` is ignored when
 * emitting declarations, so specifiers still name the `.ts` source; and a lone `.d.ts` in a
 * `type: module` package reads as ESM, so the `require` condition needs a CJS-flavoured twin.
 */
export const declarations = async (emitted: Map<string, string>) => {
  await Promise.all(
    [...emitted]
      .filter(([file]) => file.endsWith('.d.ts'))
      .flatMap(([file, content]) => [
        fs.promises.writeFile(file, retarget(content, 'js')),
        fs.promises.writeFile(file.replace(/\.d\.ts$/, '.d.cts'), retarget(content, 'cjs')),
      ]),
  )
}

/** A types-only entry has no runtime target, so it declares types under both conditions. */
const conditions = (e: Entry) =>
  e.types
    ? { import: { types: out(`${e.name}.d.ts`) }, require: { types: out(`${e.name}.d.cts`) } }
    : {
        import: { types: out(`${e.name}.d.ts`), default: out(`${e.name}.js`) },
        require: { types: out(`${e.name}.d.cts`), default: out(`${e.name}.cjs`) },
      }

/**
 * Allowlist of what the build owns, now that artefacts sit at the package root.
 *
 * Read from the output directory rather than the entry list, so shared chunks — rolldown's
 * runtime helper among them — are not left out of the tarball. npm ships the manifest, readme
 * and licence regardless, so they need no entry.
 */
const published = async () => {
  const found = await fs.promises.readdir(root('pkg'), { withFileTypes: true })
  const names = found
    .filter((f) => !/^(package\.json|README\.md|LICENSE)$/.test(f.name))
    .map((f) => (f.isDirectory() ? f.name : f.name.replace(/\..*$/, '.*')))

  return [...new Set(names)].sort()
}

const json = (p: string) => fs.promises.readFile(p, 'utf8').then(JSON.parse)

/**
 * Root manifest keys that describe the repo rather than the published package.
 *
 * `private` is among them so the root can stay unpublishable without blocking `pkg/`.
 */
const repo = new Set(['private', 'scripts', 'workspaces', 'devDependencies', 'prettier'])

const strip = (base: Record<string, unknown>) => Object.fromEntries(Object.entries(base).filter(([k]) => !repo.has(k)))

/** Copies a repo-root file into the package, ignoring it when absent. */
const copy = (name: string) => fs.promises.copyFile(root(name), root('pkg', name)).catch(() => {})

/**
 * Repoints relative specifiers in declaration text at the given output extension.
 *
 * `.d` is dropped along with the extension: a declaration importing `../types.d.ts` has to ask
 * for `../types.js`, which is the specifier typescript resolves back to `../types.d.ts`. Only
 * `from` and `import()` specifiers are touched, leaving `/// <reference path>` intact.
 */
const retarget = (content: string, ext: 'js' | 'cjs') =>
  content.replace(/((?:from|import\()\s*['"]\.[^'"]*?)(?:\.d)?\.(?:ts|js)(['"])/g, `$1.${ext}$2`)

/** Union of the runtime and peer dependencies declared across the workspace. */
const dependencies = async () => {
  const deps = dependBuilder()
  const peers = dependBuilder()

  for (const p of await packages()) {
    const content = await json(root(p.path, 'package.json'))
    deps.extend(content.dependencies)
    peers.extend(content.peerDependencies)
  }

  return { dependencies: deps.out(), peerDependencies: some(peers.out()) }
}

/** `undefined` for an empty record, which `JSON.stringify` then drops from the manifest. */
const some = <T extends object>(o: T) => (Object.keys(o).length ? o : undefined)
