import { spawn } from 'node:child_process'
import log from '@lickle/trace/log'

export type ShellOptions = {
  /** Working directory of the child. Defaults to the parent's. */
  cwd?: string
  /** Extra variables, merged over `process.env`. `undefined` unsets one. */
  env?: Record<string, string | undefined>
  /** Written to the child's stdin, which is then closed. Forces stdin to a pipe. */
  input?: string
  /**
   * Where the child's streams go. `pipe` (the default) captures them; `inherit` hands it
   * the parent's, so output streams to the terminal as it is produced and an interactive
   * command can read the keyboard. Nothing is captured when inherited.
   */
  stdio?: 'pipe' | 'inherit'
  /** Kill the child with `signal` after this many milliseconds. */
  timeout?: number
  /** Signal used by `timeout`. Defaults to `SIGTERM`. */
  signal?: NodeJS.Signals
}

export type ShellResult = {
  cmd: string
  args: string[]
  /** Captured stdout, empty when the stream was inherited. */
  stdout: string
  /** Captured stderr, empty when the stream was inherited. */
  stderr: string
  /** Exit status, or `null` when the child was killed by a signal. */
  code: number | null
  /** The signal that killed the child, if any. */
  signal: NodeJS.Signals | null
}

/**
 * A command that ran and failed. The whole {@link ShellResult} is attached as `result`,
 * because callers routinely need the exit code or the output that came before the failure.
 *
 * Deliberately has no `code` of its own: a command that could not be started at all rejects
 * with Node's spawn error instead, whose `code` is a string such as `'ENOENT'`. Keeping the
 * exit status under `result.code` keeps the two failures distinguishable.
 */
export class ShellError extends Error {
  readonly result: ShellResult
  constructor(result: ShellResult) {
    const how = result.signal ? `killed by ${result.signal}` : `exit ${result.code}`
    const why = result.stderr || result.stdout
    super(`${result.cmd} ${result.args.join(' ')} failed (${how})${why ? `: ${why}` : ''}`)
    this.name = 'ShellError'
    this.result = result
  }
}

const l = log.target('workspace:shell')

export const runSpawned = (cmd: string, args: string[], options: ShellOptions = {}): Promise<ShellResult> => {
  const { cwd, env, input, timeout, signal = 'SIGTERM', stdio = 'pipe' } = options
  const sp = l.span.trace('shell', { cmd, args, cwd, stdio })
  l.debug(`${cmd} ${args.join(' ')}`)

  // `input` needs somewhere to write, so it keeps stdin piped even when the rest is
  // inherited — the other direction is the point of inheriting: a command that wants a
  // terminal (an editor, a credential prompt) gets the parent's.
  const proc = spawn(cmd, args, {
    cwd,
    stdio: [input !== undefined ? 'pipe' : stdio, stdio, stdio],
    env: env ? { ...process.env, ...env } : process.env,
  })

  const stdout: Buffer[] = []
  const stderr: Buffer[] = []
  proc.stdout?.on('data', (data: Buffer) => stdout.push(data))
  proc.stderr?.on('data', (data: Buffer) => stderr.push(data))

  // Close a piped stdin: a command that reads it (a pager, an editor, a credential
  // prompt) would otherwise hang forever with no terminal to type into. An inherited
  // stdin is the parent's and is left alone.
  if (input !== undefined) proc.stdin?.end(input)
  else proc.stdin?.end()

  const timer = timeout === undefined ? undefined : setTimeout(() => proc.kill(signal), timeout)

  const join = (buffers: Buffer[]) => Buffer.concat(buffers).toString('utf-8').trim()

  return new Promise<ShellResult>((resolve, reject) => {
    proc.on('close', (code, killed) => {
      sp.setFields({ code, signal: killed })
      resolve({ cmd, args, stdout: join(stdout), stderr: join(stderr), code, signal: killed })
    })
    proc.on('error', (error) => reject(error))
  }).finally(() => {
    clearTimeout(timer)
    sp.end()
  })
}

/**
 * The call shapes every command runner accepts:
 *
 * - `sh('git', ['status'], { cwd })` — explicit command and arguments.
 * - ``sh`git commit -m ${msg}` `` — a template; see {@link parse_template} for how it splits.
 * - `sh({ cwd })` — returns the same runner with those options applied to every call.
 *
 * @internal Exported only because the runners' public types name it.
 */
export interface ShellMacro<R> {
  (cmd: string, args?: string[], options?: ShellOptions): Promise<R>
  (t: TemplateStringsArray, ...args: unknown[]): Promise<R>
  (options: ShellOptions): ShellMacro<R>
}

export const ShellMacro = <R>(cb: Runner<R>): ShellMacro<R> => {
  const f = (t: unknown, ...rest: any[]): Promise<R> | ShellMacro<R> => {
    if (is_template(t)) {
      const [cmd, ...args] = parse_template(t, rest)
      if (!cmd) return Promise.reject(new TypeError('shell: empty command'))
      return cb(cmd, args, {})
    }
    if (typeof t === 'string') return cb(t, rest[0] ?? [], rest[1] ?? {})
    const preset = t as ShellOptions
    return ShellMacro<R>((cmd, args, o) => cb(cmd, args, { ...preset, ...o }))
  }
  return f as ShellMacro<R>
}

/**
 * Split a template into a command and its arguments without a shell.
 *
 * Literal text splits on whitespace. Each interpolated value stays part of the word it sits
 * in, however many spaces it contains, so ``git commit -m ${msg}`` passes `msg` as one
 * argument and ``--name=${v}`` stays a single `--name=…` argument. An array interpolation
 * spreads into one argument per element (and ends any word it touches); an empty-string
 * interpolation is kept as an empty argument.
 */
const parse_template = (t: TemplateStringsArray, vals: unknown[]): string[] => {
  const out: string[] = []
  let word: string | null = null
  const flush = () => {
    if (word !== null) out.push(word)
    word = null
  }
  t.raw.forEach((text, i) => {
    for (const ch of text) {
      if (/\s/.test(ch)) flush()
      else word = (word ?? '') + ch
    }
    if (i < vals.length) {
      const v = vals[i]
      if (Array.isArray(v)) {
        flush()
        out.push(...v.map(String))
      } else {
        word = (word ?? '') + String(v)
      }
    }
  })
  flush()
  return out
}

const is_template = (t: unknown): t is TemplateStringsArray => t !== null && typeof t === 'object' && 'raw' in t

type Runner<R> = (cmd: string, args: string[], options: ShellOptions) => Promise<R>
