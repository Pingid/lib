import fs from 'node:fs'

import { root, type Bin } from './util.ts'

/**
 * Restricts the CJS output to what the package's `exports` can reach.
 *
 * A bin is executed, never imported: npm links the one file named in `bin`, and in a
 * `type: module` package that is the ESM output. Its CJS twin is dead weight — and worse than
 * inert, since rolldown has to replace `import.meta` with `{}` to produce it, so a command
 * reading `import.meta.url` would be quietly broken if anything ever did run it.
 *
 * Reachability rather than a name match, because `preserveModules` gives every module in the
 * graph a chunk: dropping a command's entry alone would strand the modules only it imports.
 * A module an export also reaches is kept, which covers a package whose bin *is* its entry.
 *
 * @param exported Output names of the bundled entry points, without an extension.
 */
export const esmOnly =
  (exported: string[]) =>
  (
    options: { format?: string },
    bundle: Record<string, { type: string; imports?: string[]; dynamicImports?: string[] }>,
  ) => {
    if (options.format !== 'cjs') return

    const keep = new Set<string>()
    const walk = (file: string) => {
      const chunk = bundle[file]
      if (!chunk || chunk.type !== 'chunk' || keep.has(file)) return
      keep.add(file)
      for (const next of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) walk(next)
    }
    for (const name of exported) walk(`${name}.cjs`)

    for (const [file, chunk] of Object.entries(bundle)) {
      if (chunk.type !== 'chunk' || keep.has(file)) continue
      delete bundle[file]
      // The sourcemap is emitted as a file of its own, and would otherwise be left behind
      // describing a chunk that is no longer there.
      delete bundle[`${file}.map`]
    }
  }

/**
 * Makes the emitted commands runnable.
 *
 * Rolldown drops the source's shebang, and the executable bit has to reach the tarball: npm
 * only chmods what it links on install, so anything invoking the file straight out of
 * `node_modules` would otherwise find it unexecutable.
 */
export const executable = async (commands: Bin[]) => {
  await Promise.all(
    commands.map(async (bin) => {
      const file = root('pkg', `${bin.name}.js`)
      const [line, content] = await Promise.all([shebang(bin.file), fs.promises.readFile(file, 'utf8')])

      if (!content.startsWith('#!')) await shift(`${file}.map`)

      await fs.promises.writeFile(file, `${line}\n${content.replace(/^#!.*\r?\n?/, '')}`)
      await fs.promises.chmod(file, 0o755)
    }),
  )
}

/** The source's own shebang, falling back to the one that makes a bundled entry runnable. */
const shebang = async (file: string) => {
  const source = await fs.promises.readFile(file, 'utf8')
  return source.match(/^#!.*/)?.[0] ?? '#!/usr/bin/env node'
}

/**
 * Moves a sourcemap down by the line the shebang is about to take.
 *
 * VLQ mappings are grouped by output line and separated by `;`, so a leading one shifts every
 * group without touching a segment. Absent maps are ignored: the build can be configured
 * without them.
 */
const shift = async (file: string) => {
  const map = await fs.promises.readFile(file, 'utf8').catch(() => undefined)
  if (map === undefined) return

  const parsed = JSON.parse(map) as { mappings?: string }
  await fs.promises.writeFile(file, JSON.stringify({ ...parsed, mappings: `;${parsed.mappings ?? ''}` }))
}
