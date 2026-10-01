import { runSpawned, ShellError, ShellMacro, type ShellOptions, type ShellResult } from './core.ts'

export type { ShellOptions, ShellResult, ShellMacro } from './core.ts'
export { ShellError } from './core.ts'

/**
 * Run a command and resolve with its result whatever the exit status. Rejects only when
 * the child could not be started at all, so a non-zero exit stays inspectable — the shape
 * commands like `git diff --quiet` need, where the status *is* the answer.
 */
export const run = ShellMacro(runSpawned)

/** Run a command, throwing a {@link ShellError} unless it exits zero. */
export const sh = ShellMacro((cmd: string, args: string[], options: ShellOptions = {}): Promise<ShellResult> =>
  runSpawned(cmd, args, options).then((r) => {
    if (r.code !== 0) throw new ShellError(r)
    return r
  }),
)

/** Run a command and return its trimmed stdout, throwing unless it exits zero. */
export const sho = ShellMacro((cmd, args, options) => sh(cmd, args, options).then((r) => r.stdout))

/** Run a command and report only whether it succeeded. Never throws for a failed command. */
export const ok = ShellMacro((cmd, args, options) =>
  runSpawned(cmd, args, options).then(
    (r) => r.code === 0,
    () => false,
  ),
)

/**
 * {@link sh} on the parent's streams, so output appears as it is produced and the command
 * can prompt for input. The result carries the status but no output. For the other runners
 * on inherited streams, pass the option: `Shell.run({ stdio: 'inherit' })`.
 */
export const io = ShellMacro((cmd, args, options) => sh(cmd, args, { ...options, stdio: 'inherit' }))
