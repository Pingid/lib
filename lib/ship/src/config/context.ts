import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

import type { Config, ConfigStack } from './index.ts'
import type { Spec } from '../resource.ts'

export type Cx = { config: Config; cwd: string; temp?: string }

export const createContext = (config: Config): Cx => ({ config, cwd: path.resolve(config.cwd ?? process.cwd()) })

/** The spec a stack declares, or the path it points at. */
export const resolveSpec = async (stack: ConfigStack): Promise<Spec | string> =>
  typeof stack === 'function' ? stack() : stack

/** A file docker can read: a path stack as-is, anything else written to scratch. */
export const resolvePath = async (ctx: Cx, stack: ConfigStack): Promise<string> => {
  const spec = await resolveSpec(stack)
  if (typeof spec === 'string') return path.resolve(ctx.cwd, spec)

  const file = path.join(scratch(ctx), `${spec.name}.json`)
  await fs.promises.writeFile(file, JSON.stringify(spec, null, 2))
  return file
}

/** Made on first write, so help and `print` leave nothing behind. */
const scratch = (ctx: Cx): string => (ctx.temp ??= fs.mkdtempSync(path.join(tmpdir(), 'ship-')))

export type ShellOptions = { bin: string; env: Record<string, string | undefined>; args: string[] }

/** Forwarded to the child; SIGINT is not, because the terminal already sent it to the whole group. */
const FORWARDED = ['SIGTERM', 'SIGHUP'] as const

export const execute = (ctx: Cx, config: ShellOptions): Promise<number> => {
  const ignore = () => {}
  const forwards = new Map<NodeJS.Signals, () => void>()

  return new Promise<number>((done, fail) => {
    const child = spawn(config.bin, config.args, { stdio: 'inherit', env: config.env })
    // Stay alive through Ctrl+C so compose can stop gracefully and scratch still gets cleaned.
    process.on('SIGINT', ignore)
    for (const signal of FORWARDED) {
      const forward = () => void child.kill(signal)
      forwards.set(signal, forward)
      process.on(signal, forward)
    }

    child.on('error', fail)
    child.on('close', (code, signal) => done(code ?? (signal ? 1 : 0)))
  }).finally(() => {
    process.off('SIGINT', ignore)
    for (const [signal, forward] of forwards) process.off(signal, forward)
    cleanScratch(ctx)
  })
}

export const cleanScratch = (ctx: Cx) => {
  if (ctx.temp) fs.rmSync(ctx.temp, { recursive: true, force: true })
  ctx.temp = undefined
}
