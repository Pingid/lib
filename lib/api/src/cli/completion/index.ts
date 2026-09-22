import { Arg } from '../arg.ts'
import { MARKER, callback } from './callback.ts'
import { Cmd } from '../cmd.ts'
import { bash } from './bash.ts'
import { fish } from './fish.ts'
import { of, type Table } from './table.ts'
import { words } from './util.ts'
import { zsh } from './zsh.ts'

export type { Table } from './table.ts'
export type { Resolve } from './resolve.ts'
export { resolve, site } from './resolve.ts'
export { MARKER, callback } from './callback.ts'

export declare namespace Completion {
  type Shell = 'bash' | 'zsh' | 'fish'

  interface Options extends Table.Options {
    /** Binary the script registers against. Defaults to the root command's name. */
    name?: string | undefined
    /**
     * Command the script re-execs for values it cannot bake in. Defaults to `name`, which
     * is right for an installed binary and wrong for `bun some/file.ts` — hence the flag.
     */
    invoke?: string | readonly string[] | undefined
    /** Emit a script that never calls back, at the cost of the forms it cannot place. */
    static?: boolean | undefined
  }
}

const shells = ['bash', 'zsh', 'fish'] as const

/**
 * @example script('zsh', cli.root, { name: 'app', version: true })
 */
export const script = (shell: Completion.Shell, root: Cmd.Node, options: Completion.Options = {}): string => {
  const name = options.name ?? root.name
  const invoke = options.static ? undefined : words(options.invoke ?? name)
  const entries = of(root, options)
  const emit = { name, invoke }

  if (shell === 'bash') return bash(entries, emit)
  return shell === 'zsh' ? zsh(entries, emit) : fish(entries, emit)
}

/**
 * Mount this to give a CLI `app completion bash|zsh|fish`. The script is a snapshot of
 * the tree, so it is regenerated after an upgrade rather than kept in step by itself.
 *
 * @example Cli.build({ binary: 'app' }).with(Completion.command())
 * @example cli.with(Completion.command({ version: true })) // also offer `--version`
 */
export const command = (options: Completion.Options = {}): Cmd.Node => {
  const cmd = Cmd.build('completion')
    .describe('Print a shell completion script')
    .arg(
      Arg.enum(shells, 'shell', { positional: true, required: true, description: 'Target shell' }),
      Arg.string('name', { description: 'Binary the script registers against' }),
      Arg.string('invoke', { description: 'Command the script re-execs for dynamic values' }),
      Arg.boolean('static', { description: 'Never call back, at the cost of the forms that need it' }),
    )

  // `root()` rather than a captured argument, so the name follows `Cli.for`'s rename.
  return cmd.handle(({ shell, name, invoke, static: fixed }) =>
    script(shell, cmd.root(), {
      ...options,
      name: name ?? options.name,
      ...(invoke === undefined ? {} : { invoke }),
      ...(fixed === undefined ? {} : { static: fixed }),
    }),
  )
}

export const Completion = { of, script, command, bash, zsh, fish, callback, MARKER }
