import { CliError } from './error.ts'
import { tokenize, type Token } from './token.ts'
import type { Arg } from '../arg.ts'
import type { Cmd } from '../cmd.ts'

export declare namespace Parse {
  interface Route {
    cmd: Cmd.Node
    argv: string[]
  }

  interface Result {
    cmd: Cmd.Node
    /** Values for the command's own args. */
    input: Record<string, unknown>
    /** Values for inherited options — these are merged into the handler's context. */
    context: Record<string, unknown>
    help: boolean
    version: boolean
  }
}

/**
 * Walk subcommands off the front of `argv`.
 *
 * Global options are allowed to appear before the subcommand — `app --use-stderr group
 * op1` — since they can be resolved by name against this node's ancestors and its whole
 * subtree. They are lifted out and handed to the leaf's parse, which is the only place
 * that knows whether the option actually applies. Any other flag stops the walk, so an
 * unknown one is reported against the node that would own it.
 */
export const route = (root: Cmd.Node, argv: string[]): Parse.Route => {
  const items = tokenize(argv)

  let cmd = root
  let index = 0

  const leading: string[] = []

  while (index < items.length) {
    const token = items[index]!
    if (token.kind === 'terminator') break

    if (token.kind === 'long' || token.kind === 'short') {
      const option = lift(cmd, token)
      if (!option) break

      leading.push(token.text)
      index += 1

      // A value-taking global written as `--flag value` or `-f value` carries its value along.
      if (option.detached && index < items.length) leading.push(items[index++]!.text)
      continue
    }

    const next = cmd.find(token.text)
    if (!next) break

    cmd = next
    index += 1
  }

  return { cmd, argv: [...leading, ...argv.slice(index)] }
}

/** What `route` accepts ahead of a subcommand: an option from here up, or from anywhere below. */
export const global = (cmd: Cmd.Node, name: string): Arg.Any | undefined =>
  [...cmd.globals(), ...cmd.subtree()].find((arg) => arg.matches(name))

/**
 * Read an option token ahead of a subcommand the way `parse` reads it at the leaf, so the walk
 * accepts every form the command itself would: `--flag`, `--flag=value`, `--no-flag`, `-f`,
 * `-f value`, `-fvalue`, `-f=value`, and boolean bundles like `-abc`.
 *
 * `detached` says the value is still the next argv element rather than part of this token.
 */
const lift = (cmd: Cmd.Node, token: Token.Long | Token.Short): { detached: boolean } | undefined => {
  if (token.kind === 'long') {
    const arg = global(cmd, token.name) ?? negatable(cmd, token.name)
    if (!arg) return undefined
    return { detached: !arg.boolean() && token.inline === undefined }
  }

  // `-=x` tokenizes to an empty body; there is no option there to lift.
  if (token.body.length === 0) return undefined

  for (let position = 0; position < token.body.length; position++) {
    const arg = global(cmd, token.body[position]!)
    if (!arg) return undefined
    if (arg.boolean()) continue

    // The rest of the body is the value, or an `=value` follows; either way the token is whole.
    return { detached: position + 1 === token.body.length && token.inline === undefined }
  }

  return { detached: false }
}

/** `--no-flag` turns off a boolean, so the walk has to see past the prefix to find it. */
const negatable = (cmd: Cmd.Node, name: string): Arg.Any | undefined => {
  if (!name.startsWith('no-')) return undefined
  const arg = global(cmd, name.slice(3))
  return arg?.boolean() ? arg : undefined
}

/**
 * Turn the remaining argv into the command's input.
 *
 * `--flag value` · `--flag=value` · `--no-flag` · `-abc` · `-n5` · `-n=5` · `--`
 *
 * Repeated flags append when the arg is an array; otherwise the last one wins.
 */
export const parse = (cmd: Cmd.Node, argv: string[]): Parse.Result => {
  const items = tokenize(argv)
  const tokens = new Map<Arg.Any, string[]>()
  const loose: string[] = []
  const inherited = new Set(cmd.globals())

  let help = false
  let version = false

  const collect = (arg: Arg.Any, value: string): void => {
    const existing = tokens.get(arg)
    if (existing) existing.push(value)
    else tokens.set(arg, [value])
  }

  const consume = (index: number, flag: string, inline?: string): [value: string, index: number] => {
    if (inline !== undefined) return [inline, index]
    const next = argv[index + 1]
    if (next === undefined) throw new CliError(`Option '${flag}' expects a value`, { code: 'missing-value', cmd })
    return [next, index + 1]
  }

  for (let index = 0; index < items.length; index++) {
    const token = items[index]!

    // `tokenize` has already applied the `--` terminator, so an operand here is final.
    if (token.kind === 'terminator') continue

    if (token.kind === 'operand') {
      loose.push(token.text)
      continue
    }

    // ---------------- long --------------------------
    if (token.kind === 'long') {
      const { name, inline } = token

      if (name === 'help' && !cmd.lookup('help')) {
        help = true
        continue
      }

      if (name === 'version' && !cmd.lookup('version')) {
        version = true
        continue
      }

      let negated = false
      let arg = cmd.lookup(name)

      if (!arg && name.startsWith('no-')) {
        const candidate = cmd.lookup(name.slice(3))
        if (candidate?.boolean()) {
          arg = candidate
          negated = true
        }
      }

      if (!arg) throw new CliError(unknownOption(`--${name}`, cmd), { code: 'unknown-option', cmd })

      if (arg.boolean()) {
        collect(arg, inline ?? String(!negated))
        continue
      }

      const [value, next] = consume(index, `--${name}`, inline)
      collect(arg, value)
      index = next
      continue
    }

    // ---------------- short --------------------------
    const { body, inline } = token

    for (let position = 0; position < body.length; position++) {
      const short = body[position]!

      if (short === 'h' && !cmd.lookup('h')) {
        help = true
        continue
      }

      const arg = cmd.lookup(short)
      if (!arg) throw new CliError(unknownOption(`-${short}`, cmd), { code: 'unknown-option', cmd })

      if (arg.boolean()) {
        collect(arg, 'true')
        continue
      }

      const trailing = body.slice(position + 1)
      const [value, next] =
        trailing.length > 0 ? ([trailing, index] as [string, number]) : consume(index, `-${short}`, inline)

      collect(arg, value)
      index = next
      position = body.length
    }
  }

  // ---------------- positionals --------------------------
  let taken = 0
  for (const arg of cmd.positional()) {
    if (arg.variadic()) {
      for (const item of loose.slice(taken)) collect(arg, item)
      taken = loose.length
      break
    }

    if (taken >= loose.length) break
    collect(arg, loose[taken++]!)
  }

  if (help || version) return { cmd, input: {}, context: {}, help, version }

  if (taken < loose.length) {
    const extra = loose[taken]!
    // A node with subcommands and no slot left for this token was given a bad command.
    if (cmd.commands.length > 0) throw new CliError(unknownCommand(extra, cmd), { code: 'unknown-command', cmd })
    throw new CliError(`Unexpected argument '${extra}'`, { code: 'unexpected-argument', cmd })
  }

  // ---------------- values --------------------------
  const input: Record<string, unknown> = {}
  const context: Record<string, unknown> = {}
  const missing: Arg.Any[] = []

  for (const arg of [...cmd.args, ...cmd.globals()]) {
    const into = inherited.has(arg) ? context : input
    const collected = tokens.get(arg)

    if (collected === undefined) {
      const fallback = arg.default()
      if (fallback !== undefined) into[arg.name] = fallback
      else if (arg.required) missing.push(arg)
      continue
    }

    try {
      into[arg.name] = arg.decode(collected)
    } catch (error) {
      throw error instanceof CliError ? error.at(cmd) : error
    }
  }

  if (missing.length > 0) {
    const names = missing.map((arg) => arg.token()).join(', ')
    const noun = missing.length === 1 ? 'argument' : 'arguments'
    throw new CliError(`Missing required ${noun}: ${names}`, { code: 'missing-argument', cmd })
  }

  return { cmd, input, context, help, version }
}

const unknownOption = (flag: string, cmd: Cmd.Node): string => {
  const near = closest(
    flag.replace(/^-+/, ''),
    [...cmd.flags(), ...cmd.globals()].map((arg) => arg.flag()),
  )
  return `Unknown option '${flag}'${near ? `. Did you mean '--${near}'?` : ''}`
}

const unknownCommand = (name: string, cmd: Cmd.Node): string => {
  const near = closest(
    name,
    cmd.commands.map((child) => child.name),
  )
  return `Unknown command '${name}'${near ? `. Did you mean '${near}'?` : ''}`
}

const closest = (value: string, candidates: string[]): string | undefined => {
  let best: string | undefined
  let score = Infinity

  for (const candidate of candidates) {
    const cost = distance(value, candidate)
    if (cost < score) {
      score = cost
      best = candidate
    }
  }

  return score <= Math.max(2, Math.floor(value.length / 3)) ? best : undefined
}

const distance = (a: string, b: string): number => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]!
    row[0] = i

    for (let j = 1; j <= b.length; j++) {
      const previous = row[j]!
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = previous
    }
  }

  return row[b.length]!
}

export const Parse = { route, parse, global }
