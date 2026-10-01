import { createJiti } from 'jiti'
import path from 'node:path'
import fs from 'node:fs'

import type { Config } from '../src/config/index.ts'

const CANDIDATES = [
  'ship.config.ts',
  'ship.config.mts',
  'ship.config.js',
  'ship.config.mjs',
  'stack.config.ts',
  'stack.config.mts',
  'stack.config.js',
  'stack.config.mjs',
]

const jiti = createJiti(import.meta.url, { moduleCache: false })

/** Evaluate a config; relative paths in its stacks resolve against the file's directory. */
export const load = async (configPath?: string): Promise<Config> => {
  const file = find(configPath)

  const module = await jiti.import<Record<string, unknown>>(file)
  const exported = module['default'] ?? module['stacks'] ?? module['config']
  const value = await (typeof exported === 'function' ? (exported as () => unknown)() : exported)

  if (value == null) throw new Error(`${file} has no default export`)
  const config = value as Config
  return { ...config, cwd: path.resolve(path.dirname(file), config.cwd ?? '.') }
}

/**
 * Split ship's own `--config` off argv. Only flags ahead of the first word are ship's — after
 * the stack or command, everything belongs to docker, `-c` included.
 */
export const configOf = (argv: string[]): { file: string | undefined; rest: string[] } => {
  let file: string | undefined
  let index = 0

  for (; index < argv.length; index++) {
    const token = argv[index]!
    if (token === '-c' || token === '--config') file = argv[++index]
    else if (token.startsWith('--config=')) file = token.slice('--config='.length)
    else if (token.startsWith('-c') && !token.startsWith('--')) file = token.slice(2)
    else break
  }

  return { file, rest: argv.slice(index) }
}

/** The explicit path, or the nearest config at or above the working directory. */
const find = (explicit?: string): string => {
  if (explicit) {
    const pth = path.resolve(explicit)
    if (!fs.existsSync(pth)) throw new Error(`config not found: ${pth}`)
    return pth
  }

  for (let dir = process.cwd(), up = path.dirname(dir); ; dir = up, up = path.dirname(dir)) {
    for (const candidate of CANDIDATES) {
      const pth = path.resolve(dir, candidate)
      if (fs.existsSync(pth)) return pth
    }
    if (up === dir) break
  }

  throw new Error(`no config found — looked for ${CANDIDATES.join(', ')} in ${process.cwd()} and its parents`)
}
