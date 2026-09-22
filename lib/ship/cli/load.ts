#!/usr/bin/env node
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { createJiti } from 'jiti'

import { Repo } from '@pingid/lib-workspace'

// import { Project, Stack, type Spec } from '../src/index.ts'
import type { Config } from '../src/config.ts'

const CONFIG_CANDIDATES = ['stack.config.ts', 'stack.config.mts', 'stack.config.js', 'stack.config.mjs']

const jiti = createJiti(import.meta.url, { moduleCache: false })

export const load = async (configPath: string): Promise<Config> => {
  const module = await jiti.import<Record<string, unknown>>(configPath)
  const exported = module['default'] ?? module['stacks'] ?? module['config']
  const value = await (typeof exported === 'function' ? (exported as () => unknown)() : exported)
  if (value == null) throw new Error(`${configPath} has no default export`)
  return value as Config
  // if (value instanceof Stack) return Project.build(value)
  // if (Array.isArray(value)) return Project.build(...value)
  // if (typeof value === 'object' && 'specs' in value && 'order' in value) return value as Project

  // // A bare `compose()` result: treat it as a single stack named after the directory.
  // const spec = value as Spec
  // const name = spec.name ?? basename(dirname(configPath))
  // return { order: [name], edges: [], specs: { [name]: spec }, projects: { [name]: name } }
}

export const find = async (explicit?: string): Promise<string> => {
  if (explicit) {
    const path = resolve(explicit)
    if (!existsSync(path)) throw new Error(`config not found: ${path}`)
    return path
  }
  const found = findIn(process.cwd())
  if (found) return found

  const repo = await Repo.discover().catch(() => undefined)
  if (repo && repo.dir !== explicit) {
    findIn(repo.dir)
    if (found) return found
  }
  throw new Error(`no config found — looked for ${CONFIG_CANDIDATES.join(', ')} in ${process.cwd()}`)
}

const findIn = (dir: string = process.cwd()): string | undefined => {
  for (const candidate of CONFIG_CANDIDATES) {
    const path = resolve(dir, candidate)
    if (existsSync(path)) return path
  }
  return undefined
}

// type Options = {
//   command: string
//   stacks: string[]
//   config?: string
//   projectDir?: string
//   out?: string
//   validate: boolean
//   watch: boolean
//   dryRun: boolean
//   dockerArgs: string[]
// }

// const parse = (argv: string[]): Options => {
//   const options: Options = {
//     command: 'help',
//     stacks: [],
//     validate: true,
//     watch: false,
//     dryRun: false,
//     dockerArgs: [],
//   }

//   const rest: string[] = []
//   for (let i = 0; i < argv.length; i++) {
//     const arg = argv[i]!
//     if (arg === '--') {
//       options.dockerArgs.push(...argv.slice(i + 1))
//       break
//     }
//     const next = (): string => {
//       const value = argv[++i]
//       if (value === undefined) throw new Error(`${arg} expects a value`)
//       return value
//     }
//     if (arg === '-c' || arg === '--config') options.config = next()
//     else if (arg === '-s' || arg === '--stack') options.stacks.push(next())
//     else if (arg === '--project-dir' || arg === '--project-directory') options.projectDir = next()
//     else if (arg === '--out' || arg === '-o') options.out = next()
//     else if (arg === '--no-validate') options.validate = false
//     else if (arg === '--watch') options.watch = true
//     else if (arg === '--dry-run') options.dryRun = true
//     else rest.push(arg)
//   }

//   // `stack -- up -d` should still mean `up`.
//   options.command = rest.shift() ?? options.dockerArgs.shift() ?? 'help'
//   // For local commands the remaining bare words select stacks; for passthrough they belong to docker.
//   if (LOCAL.has(options.command)) options.stacks.push(...rest)
//   else options.dockerArgs.unshift(...rest)

//   return options
// }

// /** Docker commands that tear down, and so run in reverse dependency order. */
// const REVERSED = new Set(['down', 'stop', 'kill', 'rm'])

// /** Docker commands that own the user's terminal; these get a temp file so stdin stays theirs. */
// const INTERACTIVE = new Set(['exec', 'run', 'attach'])

// /** Handled here rather than passed to docker. */
// const LOCAL = new Set(['ls', 'build', 'check', 'help', '--help', '-h'])
