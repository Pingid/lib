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
 * A command that ran and failed. The whole {@link ShellResult} is attached, because
 * callers routinely need the exit code or the output that came before the failure.
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

  get code() {
    return this.result.code
  }
  get stdout() {
    return this.result.stdout
  }
  get stderr() {
    return this.result.stderr
  }
}

const l = log.target('workspace:shell')

export interface ShellMacro<O, R> {
  (cmd: string, args: string[], o: O): Promise<R>
  (t: TemplateStringsArray, ...args: any[]): Promise<R>
  (opts: O): ShellMacro<O, R>
}

const make_macro = <O, R>(cb: (cmd: string, args: string[], o: O) => Promise<R>): ShellMacro<O, R> => {
  const f = (t: any, ...arg: any[]): Promise<R> => {
    if (is_template(t)) {
      const str = String.raw(t, ...arg)
      const [cmd, ...args] = str.split(' ')
      return cb(cmd!, args, {} as O)
    }
    if (typeof t === 'string') return cb(t, arg[0], arg[1] ?? {})
    return make_macro((cmd, args, o) => cb(cmd, args, { ...t, ...(o as {}) })) as any
  }
  return f as ShellMacro<O, R>
}

const is_template = (t: any): t is TemplateStringsArray => t !== null && typeof t === 'object' && 'raw' in t

export class Shell {
  /**
   * Run a command and resolve with its result whatever the exit status. Rejects only when
   * the child could not be started at all, so a non-zero exit stays inspectable — the shape
   * commands like `git diff --quiet` need, where the status *is* the answer.
   */
  static run = (cmd: string, args: string[], options: ShellOptions = {}): Promise<ShellResult> => {
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

    const join = (buffers: Buffer[]) =>
      buffers
        .map((b) => b.toString('utf-8'))
        .join('')
        .trim()

    return new Promise<ShellResult>((resolve, reject) => {
      proc.on('close', (code, killed) => {
        const result = { cmd, args, stdout: join(stdout), stderr: join(stderr), code, signal: killed }
        sp.setFields({ code, signal: killed })
        resolve(result)
      })
      proc.on('error', (error) => reject(error))
    }).finally(() => {
      clearTimeout(timer)
      sp.end()
    })
  }

  /** Run a command, throwing a {@link ShellError} unless it exits zero. */
  static sh = make_macro((cmd: string, args: string[], options: ShellOptions = {}): Promise<ShellResult> =>
    Shell.run(cmd, args, options).then((r) => {
      if (r.code !== 0) throw new ShellError(r)
      return r
    }),
  )

  /** Run a command and return its trimmed stdout, throwing unless it exits zero. */
  static sho = (cmd: string, args: string[], options: ShellOptions = {}): Promise<string> =>
    Shell.sh(cmd, args, options).then((r) => r.stdout)

  /**
   * Run a command on the parent's streams, so its output appears as it is produced and it
   * can prompt for input. Throws a {@link ShellError} unless it exits zero; the result
   * carries the status but no output, since nothing was captured.
   */
  static io = make_macro((cmd: string, args: string[], options: ShellOptions = {}): Promise<ShellResult> =>
    Shell.sh(cmd, args, { ...options, stdio: 'inherit' }),
  )

  /** Run a command and report only whether it succeeded. Never throws for a failed command. */
  static ok = make_macro((cmd: string, args: string[], options: ShellOptions = {}): Promise<boolean> =>
    Shell.run(cmd, args, options).then(
      (r) => r.code === 0,
      () => false,
    ),
  )
}
