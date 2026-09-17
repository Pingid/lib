import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'node:path'

import { entries, aliases, root, tsconfig, flat, hoist } from './util.ts'
import { manifest, declarations } from './manifest.ts'

const all = await entries()
const alias = await aliases()

// Types-only entries have no module to bundle; they reach the package via the dts plugin.
const entry = Object.fromEntries(all.filter((e) => !e.types).map((e) => [e.name, e.file]))

const dir = root('pkg')

const formats = [
  { format: 'es', ext: 'js' },
  { format: 'cjs', ext: 'cjs' },
] as const

/**
 * Names every chunk by where its module belongs in the published layout.
 *
 * `preserveModules` would otherwise derive paths from the source tree, which is what leaks
 * `lib/<pkg>/src` into the output. Rolldown's own helper chunks have no backing file, so they
 * keep the name it gave them.
 */
const chunkName = (ext: string) => (chunk: { name: string; facadeModuleId?: string | null }) => {
  const id = chunk.facadeModuleId
  const name = id && !id.includes('\0') ? flat(id) : chunk.name
  return `${name.startsWith('..') ? chunk.name : name}.${ext}`
}

export default defineConfig({
  resolve: { alias },
  plugins: [
    dts({
      tsconfigPath: tsconfig('dts'),
      // Workspace sources are inlined into the bundle, so they need declarations too. Type-only
      // modules never reach the bundler, hence globs rather than the module graph.
      include: ['src/**/*.ts', 'lib/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', 'node_modules/**'],
      entryRoot: root(),
      outDirs: dir,
      // `.d.ts` sources are hand-written, not emitted, so they have to be carried across.
      copyDtsFiles: true,
      // Declarations are emitted against the source tree; move them to match the bundle.
      beforeWriteFile: (file, content) => ({
        filePath: path.join(dir, hoist(path.relative(dir, file).split(path.sep).join('/'))),
        content,
      }),
      afterBuild: declarations,
    }),
    { name: 'pkg', closeBundle: manifest },
  ],
  build: {
    lib: { entry },
    outDir: dir,
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    rolldownOptions: {
      // Workspace packages are aliased to source and inlined; everything else stays a bare import.
      external: (id) => !id.startsWith('@pingid/lib') && !id.startsWith('.') && !id.startsWith('/'),
      output: formats.map(({ format, ext }) => ({
        format,
        entryFileNames: chunkName(ext),
        chunkFileNames: chunkName(ext),
        preserveModules: true,
      })),
    },
  },
})
