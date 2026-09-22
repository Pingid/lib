import { clean } from './util.ts'
import { kebab } from '../arg.ts'
import type { Arg } from '../arg.ts'
import type { Cmd } from '../cmd.ts'

export declare namespace Table {
  type Item = Arg.Item

  /** `Arg.Complete` flattened to something a script can carry. A function becomes `call`. */
  type Spec = Arg.Source | 'call' | readonly string[]

  interface Options {
    /** Offer `--version` at the root. Set when the CLI was configured with one. */
    version?: boolean | undefined
  }

  /** @example { names: ['--env', '-e'], takes: true, spec: ['dev', 'prod'] } */
  interface Flag {
    /** The long form first, then one entry per alias. */
    names: string[]
    description?: string | undefined
    /** Consumes a following token. False for booleans. */
    takes: boolean
    spec?: Spec | undefined
  }

  /**
   * One command path's baked answers.
   *
   * @example { path: ['deploy'], commands: [], flags: [...], positionals: [['dev', 'prod']] }
   */
  interface Entry {
    /** The subcommand chain below the root, in kebab form. Empty at the root. */
    path: string[]
    commands: Item[]
    flags: Flag[]
    /** Per positional slot, in `cmd.positional()` order. Truncated at the variadic. */
    positionals: (Spec | undefined)[]
    /** The last slot soaks up every remaining token, so it never advances past it. */
    variadic: boolean
    /** Spellings `find` accepts besides the canonical kebab, paired with it. */
    aliases: [spelling: string, canonical: string][]
  }
}

/**
 * Flatten the tree into one entry per reachable command path.
 *
 * @example of(root).map((entry) => entry.path.join(' ')) // ['', 'deploy', 'deploy api']
 */
export const of = (root: Cmd.Node, options: Table.Options = {}): Table.Entry[] => {
  const entries: Table.Entry[] = []

  const walk = (cmd: Cmd.Node, path: string[]): void => {
    entries.push(entry(cmd, path, options.version === true && cmd === root))
    for (const child of cmd.commands) walk(child, [...path, kebab(child.name)])
  }

  walk(root, [])
  return entries
}

/** One command's own answers. Exported so `resolve` builds candidates the same way. */
export const entry = (cmd: Cmd.Node, path: string[], version: boolean): Table.Entry => {
  const positional = cmd.positional()

  // `parse` stops filling slots at the first variadic, so nothing after it is reachable.
  const stop = positional.findIndex((arg) => arg.variadic())
  const slots = stop === -1 ? positional : positional.slice(0, stop + 1)

  return {
    path,
    commands: cmd.commands.map((child) => ({ value: kebab(child.name), description: clean(child.description) })),
    flags: flags(cmd, version),
    positionals: slots.map((arg) => flatten(spec(cmd, arg))),
    variadic: stop !== -1,
    aliases: cmd.commands
      .filter((child) => kebab(child.name) !== child.name)
      .map((child) => [child.name, kebab(child.name)]),
  }
}

export const flags = (cmd: Cmd.Node, version: boolean): Table.Flag[] => {
  // `subtree()` options are accepted ahead of a subcommand but deliberately not
  // suggested — `Help` does not list them either, and every descendant's option at
  // the root is noise.
  const declared = [...cmd.flags(), ...cmd.globals()].map((arg) => ({
    names: [`--${arg.flag()}`, ...arg.aliases().map((alias) => `-${alias}`)],
    description: clean(arg.summary()),
    takes: !arg.boolean(),
    spec: flatten(spec(cmd, arg)),
  }))

  const help = 'Show this help message'
  const synthetic: Table.Flag[] = []

  // `parse` synthesises these unless a declared arg shadows them.
  if (!cmd.lookup('help')) synthetic.push({ names: ['--help'], description: help, takes: false })
  if (!cmd.lookup('h')) synthetic.push({ names: ['-h'], description: help, takes: false })
  if (version) synthetic.push({ names: ['--version'], description: 'Show version number', takes: false })

  return [...declared, ...synthetic]
}

/** A function cannot be baked into a script, so the drivers call back for it instead. */
const flatten = (value: Arg.Complete | undefined): Table.Spec | undefined =>
  typeof value === 'function' ? 'call' : value

/** An override on the declaring command wins, so a global can be set once at the root. */
export const spec = (cmd: Cmd.Node, arg: Arg.Any): Arg.Complete | undefined => {
  for (let node: Cmd.Node | undefined = cmd; node; node = node.parent) {
    const found = node.completions.get(arg.name)
    if (found !== undefined) return found
  }

  return arg.completion()
}

export const Table = { of, entry, flags, spec }
