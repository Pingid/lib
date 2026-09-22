import { Parse } from '../core/parse.ts'
import { tokenize } from '../core/token.ts'
import { clean } from './util.ts'
import { entry, spec as specOf } from './table.ts'
import { kebab } from '../arg.ts'
import type { Arg } from '../arg.ts'
import type { Cmd } from '../cmd.ts'

export declare namespace Resolve {
  interface Options {
    /** Offer `--version` at the root. Mirrors `Table.Options`. */
    version?: boolean | undefined
  }

  /** What the cursor word is. */
  type Kind = 'flag' | 'value' | 'operand' | 'none'

  interface Site {
    cmd: Cmd.Node
    kind: Kind
    /** The cursor word, with any `--flag=` or `-vn` prefix stripped off. */
    word: string
    /** Text stripped off the front. Empty unless the word was glued. */
    prefix: string
    /** Subcommands belong here too — slot 0 at a node the walk never left. */
    commands: boolean
    arg?: Arg.Any | undefined
    spec?: Arg.Complete | undefined
    /** Positional slot index, for `operand`. */
    slot?: number | undefined
  }

  type Directive = 'default' | 'none' | 'file' | 'dir'

  interface Result {
    site: Site
    items: Arg.Item[]
    directive: Directive
  }
}

/**
 * Place the cursor. The last of `words` is the one being edited, and `words[0]` is NOT the
 * binary — the caller strips it. Pure, synchronous, and never throws.
 *
 * @example site(root, ['build', '--env', 'd']).kind // 'value'
 * @example site(root, ['']).commands                // true
 */
export const site = (root: Cmd.Node, words: readonly string[]): Resolve.Site => {
  const word = words[words.length - 1] ?? ''
  const state = walk(root, words.slice(0, -1))
  const { cmd } = state

  const base = { cmd, word, prefix: '', commands: false }

  if (state.pending) {
    return { ...base, kind: 'value', arg: state.pending, spec: specOf(cmd, state.pending) }
  }

  // Past a `--` the cursor word is an operand however it is spelled, so the dash
  // branches below are skipped entirely rather than classifying it in isolation.
  const cursor = state.terminated ? undefined : tokenize([word])[0]

  // `parse` treats a bare `-` as positional; here the user is plainly starting a flag.
  if (!state.terminated && word === '-') return { ...base, kind: 'flag' }
  if (!state.terminated && word === '--') return { ...base, kind: 'none' }

  if (cursor?.kind === 'long') {
    if (cursor.inline === undefined) return { ...base, kind: 'flag' }

    const arg = lookup(cmd, cursor.name)
    if (!arg || arg.boolean()) return { ...base, kind: 'none' }

    const prefix = `--${cursor.name}=`
    return { ...base, kind: 'value', word: cursor.inline, prefix, arg, spec: specOf(cmd, arg) }
  }

  if (cursor?.kind === 'short') {
    for (const [index, short] of [...cursor.body].entries()) {
      const arg = cmd.lookup(short)
      if (!arg || arg.boolean()) continue

      const tail = cursor.body.slice(index + 1)
      const prefix = `-${cursor.body.slice(0, index + 1)}${cursor.inline === undefined ? '' : '='}`
      return { ...base, kind: 'value', word: cursor.inline ?? tail, prefix, arg, spec: specOf(cmd, arg) }
    }

    // A completed cluster. Offering `-w` -> `-wv`, `-wc` reads badly and nobody expects it.
    return { ...base, kind: 'none' }
  }

  const slots = cmd.positional()
  const last = slots.length - 1
  const variadic = slots[last]?.variadic() === true

  const slot = variadic && state.slot > last ? last : state.slot
  const arg = slots[slot]

  return {
    ...base,
    kind: 'operand',
    slot,
    commands: state.routing && state.slot === 0,
    ...(arg ? { arg, spec: specOf(cmd, arg) } : {}),
  }
}

/**
 * `site`, plus the values behind it. Never rejects — a thrown source is a wedged TAB key,
 * so anything unexpected degrades to "offer nothing, let the shell complete filenames".
 */
export const resolve = async (
  root: Cmd.Node,
  words: readonly string[],
  options: Resolve.Options = {},
): Promise<Resolve.Result> => {
  const found = ((): Resolve.Site => {
    try {
      return site(root, words)
    } catch {
      return { cmd: root, kind: 'none', word: '', prefix: '', commands: false }
    }
  })()

  try {
    const items = await candidates(found, words, options)
    const prefixed = found.prefix ? items.map((item) => ({ ...item, value: `${found.prefix}${item.value}` })) : items

    return { site: found, items: prefixed, directive: directive(found, prefixed) }
  } catch {
    return { site: found, items: [], directive: 'default' }
  }
}

// ---------------- walk --------------------------
interface State {
  cmd: Cmd.Node
  slot: number
  /** Still descending subcommands, so `route`'s rules apply rather than `parse`'s. */
  routing: boolean
  /** A `--` has settled, so nothing further can be a flag. */
  terminated: boolean
  pending: Arg.Any | undefined
}

const walk = (root: Cmd.Node, head: readonly string[]): State => {
  const state: State = { cmd: root, slot: 0, routing: true, terminated: false, pending: undefined }

  for (const token of tokenize(head)) {
    if (state.pending) {
      state.pending = undefined
      continue
    }

    if (token.kind === 'terminator') {
      state.routing = false
      state.terminated = true
      continue
    }

    if (token.kind === 'operand') {
      const next = state.routing ? state.cmd.find(token.text) : undefined

      if (next) {
        state.cmd = next
        state.slot = 0
      } else {
        state.routing = false
        state.slot += 1
      }
      continue
    }

    const name = token.kind === 'long' ? token.name : token.body

    // While routing, an option may belong to an ancestor or to any descendant.
    if (state.routing) {
      const global = Parse.global(state.cmd, name)
      if (global) {
        if (!global.boolean() && token.inline === undefined) state.pending = global
        continue
      }
      state.routing = false
    }

    if (token.kind === 'long') {
      const arg = lookup(state.cmd, name)
      // An unrecognised flag is assumed to take no value: swallowing the next word on a
      // guess misplaces the cursor far more often than it helps.
      if (arg && !arg.boolean() && token.inline === undefined) state.pending = arg
      continue
    }

    for (const [index, short] of [...token.body].entries()) {
      const arg = state.cmd.lookup(short)
      if (!arg || arg.boolean()) continue

      const glued = token.body.slice(index + 1).length > 0 || token.inline !== undefined
      if (!glued) state.pending = arg
      break
    }
  }

  return state
}

/** `cmd.lookup`, plus `parse`'s `--no-` fallback, which only applies to booleans. */
const lookup = (cmd: Cmd.Node, name: string): Arg.Any | undefined => {
  const direct = cmd.lookup(name)
  if (direct) return direct

  if (!name.startsWith('no-')) return undefined

  const candidate = cmd.lookup(name.slice(3))
  return candidate?.boolean() ? candidate : undefined
}

// ---------------- candidates --------------------------
const candidates = async (
  site: Resolve.Site,
  words: readonly string[],
  options: Resolve.Options,
): Promise<Arg.Item[]> => {
  if (site.kind === 'none') return []
  if (site.kind === 'flag') return flags(site, options)

  const values = await source(site, words)
  if (site.kind === 'value') return values

  const commands = site.commands
    ? site.cmd.commands.map((child) => ({ value: kebab(child.name), description: clean(child.description) }))
    : []

  return [...commands, ...values]
}

const source = async (site: Resolve.Site, words: readonly string[]): Promise<Arg.Item[]> => {
  const spec = site.spec

  // `file` and `dir` are the shell's job; they travel as a directive, not as items.
  if (spec === undefined || typeof spec === 'string') return []
  if (typeof spec !== 'function') return spec.map((value) => ({ value }))
  if (!site.arg) return []

  return normalise(await spec({ cmd: site.cmd, arg: site.arg, word: site.word, words }))
}

const flags = (site: Resolve.Site, options: Resolve.Options): Arg.Item[] => {
  const declared = entry(site.cmd, [], options.version === true && site.cmd.parent === undefined).flags

  const items = declared.flatMap((flag) => flag.names.map((value) => ({ value, description: flag.description })))

  // Only once the user has committed to the shape, or the list roughly doubles. The
  // drivers escape on the same prefix, so the two stay in step.
  if (!site.word.startsWith('--no')) return items

  const negated = declared
    .filter((flag) => !flag.takes && flag.names[0]?.startsWith('--') && flag.names[0] !== '--help')
    .map((flag) => ({ value: `--no-${flag.names[0]!.slice(2)}`, description: flag.description }))

  return [...items, ...negated]
}

/** A tab or a newline would break the wire, so such a value is dropped rather than mangled. */
const normalise = (values: Arg.Values): Arg.Item[] =>
  values
    .map((value) => (typeof value === 'string' ? { value } : value))
    .filter((item) => item.value !== '' && !/[\t\n\r]/.test(item.value))
    .map((item) => ({ value: item.value, description: clean(item.description) }))

const directive = (site: Resolve.Site, items: Arg.Item[]): Resolve.Directive => {
  if (site.spec === 'file' || site.spec === 'dir') {
    // With a prefix the shell knows the real word boundary and we do not; let it complete.
    return site.prefix ? 'default' : site.spec
  }

  if (site.kind === 'none') return 'none'
  return items.length > 0 ? 'none' : 'default'
}

export const Resolve = { site, resolve }
