import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

import { createJiti } from 'jiti'

import { ContextValue, Project, Stack, type Spec } from '../src/index.ts'
import type { ProjectEntry } from '../src/project.ts'
import type { Config } from '../src/config.ts'

const CANDIDATES = ['stack.config.ts', 'stack.config.mts', 'stack.config.js', 'stack.config.mjs']

/** Docker commands that own the user's terminal; these get a real file so stdin stays theirs. */
const INTERACTIVE = new Set(['exec', 'run', 'attach'])

/**
 * Loads configs with the module cache off, so every call re-evaluates the whole graph rather
 * than replaying node's copy. jiti also transpiles TypeScript, so a `.ts` config does not
 * depend on the running node being new enough to strip types.
 *
 * One caveat: jiti transforms TypeScript wherever it finds it, so a config that imports this
 * library's *sources* gets its own copy of them, and the `instanceof` checks below — which
 * compare against the copy the CLI was built with — will not recognise what it exports.
 * Importing the built package, as a consumer does, keeps one shared copy.
 */
const jiti = createJiti(import.meta.url, { moduleCache: false })

/** The explicit path, or the nearest config at or above the working directory. */
export const find = (explicit?: string): string => {
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

/** Evaluate a config and build every stack it declares. */
export const load = async (configPath: string): Promise<Project> => {
  const module = await jiti.import<Record<string, unknown>>(configPath)
  const exported = module['default'] ?? module['stacks'] ?? module['config']
  const value = await (typeof exported === 'function' ? (exported as () => unknown)() : exported)

  if (value == null) throw new Error(`${configPath} has no default export`)
  return Project.build(...entries(value))
}

/**
 * The shapes a config may export: one stack, a list of stacks and context values, or a
 * record of stacks whose `$provide` carries the values shared across all of them.
 */
const entries = (value: unknown): ProjectEntry[] => {
  if (value instanceof Stack || value instanceof ContextValue) return [value]
  if (Array.isArray(value)) return value as ProjectEntry[]

  const { $provide = [], ...stacks } = value as Config & { $provide?: ContextValue[] }
  return [...$provide, ...(Object.values(stacks) as ProjectEntry[])]
}

export const write = async (spec: Spec, file: string): Promise<void> => {
  await fs.promises.mkdir(path.dirname(file), { recursive: true })
  await fs.promises.writeFile(file, `${JSON.stringify(spec, null, 2)}\n`)
}

/**
 * Run docker and return its stdout. The spec goes on stdin when one is given; stderr is left
 * alone, so a failure explains itself in the user's terminal before the throw lands.
 */
export const capture = (args: string[], spec?: Spec): Promise<string> =>
  new Promise<string>((done, fail) => {
    const child = spawn('docker', args, { stdio: [spec ? 'pipe' : 'ignore', 'pipe', 'inherit'] })
    let out = ''

    child.on('error', fail)
    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => (out += chunk))
    child.on('close', (code, signal) => {
      if (code === 0) return done(out)
      fail(new Error(`docker ${args.slice(0, 2).join(' ')} exited with ${code ?? signal}`))
    })

    if (spec && child.stdin) {
      child.stdin.on('error', () => {})
      child.stdin.end(JSON.stringify(spec))
    }
  })

/**
 * Run docker with the generated file supplied on stdin — compose accepts JSON because YAML
 * is a superset of it, so nothing here depends on a YAML writer.
 *
 * `exec`/`run`/`attach` need the user's stdin for themselves, so for those the spec goes to a
 * temp file and `-` in the arguments is rewritten to point at it.
 */
export const docker = (args: string[], spec: Spec, command: string): Promise<number> => {
  const interactive = INTERACTIVE.has(command)

  let scratch: string | undefined
  let full = args

  if (interactive) {
    scratch = fs.mkdtempSync(path.join(tmpdir(), 'ship-'))
    const file = path.join(scratch, 'compose.json')
    fs.writeFileSync(file, JSON.stringify(spec))
    full = args.map((arg) => (arg === '-' ? file : arg))
  }

  return new Promise<number>((done, fail) => {
    const child = spawn('docker', full, { stdio: interactive ? 'inherit' : ['pipe', 'inherit', 'inherit'] })
    child.on('error', fail)
    // A signal death is not a success.
    child.on('close', (code, signal) => done(code ?? (signal ? 1 : 0)))

    if (!interactive && child.stdin) {
      // Docker may exit before reading the spec (bad subcommand, daemon down); EPIPE here is
      // expected and the real failure shows up as the exit code.
      child.stdin.on('error', () => {})
      child.stdin.end(JSON.stringify(spec))
    }
  }).finally(() => {
    if (scratch) fs.rmSync(scratch, { recursive: true, force: true })
  })
}
