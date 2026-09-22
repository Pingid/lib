import type { Schema } from '../core/index.ts'
import { choices, token as coerceToken } from '../core/coerce.ts'
import { format, kebab } from '../core/text.ts'
import { CliError } from './core/error.ts'
import type { Compute, Intersect } from './core/util.ts'
import type { Cmd } from './cmd.ts'

export declare namespace Arg {
  type Any = Arg<string, any, boolean>

  /** Completion the shell performs for itself. */
  type Source = 'file' | 'dir'

  /** One offer. A bare string is shorthand for `{ value }`. */
  interface Item {
    value: string
    description?: string | undefined
  }

  type Values = readonly (string | Item)[]

  /**
   * What a dynamic source is told. Deliberately small: the line is mid-edit, so there is
   * no parse to read sibling values off. Members are only ever added, so a source written
   * today keeps compiling.
   */
  interface Context {
    /** The command the cursor resolved to. */
    cmd: Cmd.Node
    /** The arg being completed. */
    arg: Arg.Any
    /** The partial token, with any `--flag=` or `-n` prefix already stripped. */
    word: string
    /** Every word after the binary, up to and including `word`. */
    words: readonly string[]
  }

  /**
   * Values computed when the shell asks. Costs one subprocess per completion, so the
   * generated script only calls back for args that declare one.
   *
   * @example Arg.string('branch', { complete: (c) => branches(c.word) })
   * @example Arg.string('pod', { complete: async () => (await pods()).map((p) => ({ value: p.name, description: p.status })) })
   */
  type Fn = (context: Context) => Values | Promise<Values>

  /**
   * Where an arg's values come from when completing.
   *
   * @example Arg.string('config', { complete: 'file' })
   * @example Arg.string('env', { complete: ['dev', 'prod'] })
   * @example Arg.string('branch', { complete: (c) => branches(c.word) })
   */
  type Complete = Source | readonly string[] | Fn

  interface Options<T> {
    description?: string | undefined
    default?: T | undefined
    /** Fails the parse when absent. */
    required?: boolean | undefined
    /** Taken from positional argv. A command's own `positional()` list overrides this. */
    positional?: boolean | undefined
    /** Short forms: `alias: 'v'` or `alias: ['v']` binds `-v`. */
    alias?: string | readonly string[] | undefined
    /** Where the values come from when completing. */
    complete?: Complete | undefined
  }

  /** Present on the input when declared required or carrying a default. */
  type Present<O> = O extends { required: true } ? true : O extends { default: any } ? true : false

  type Field<A> =
    A extends Arg<infer N, infer T, true>
      ? { [K in N]: T }
      : A extends Arg<infer N, infer T, boolean>
        ? { [K in N]?: T }
        : {}

  /** Args (usually a union of them) to the object shape they contribute. */
  type Fields<A> = Compute<Intersect<A extends any ? Field<A> : never>>
}

/**
 * A single named input: its JSON Schema fragment plus how it arrives on the command
 * line. Standalone — an arg does not know which command it belongs to, so it can be
 * declared once and reused.
 */
export class Arg<N extends string = string, T = unknown, P extends boolean = false> {
  name: N
  json: Schema.Json
  required: boolean
  positional: boolean
  /** Kept off `json`: a function has to survive here once dynamic sources land. */
  complete: Arg.Complete | undefined

  declare readonly _?: (input: never) => [T, P]

  constructor(name: N, json: Schema.Json, options: Arg.Options<any> = {}) {
    const { required, positional, alias, complete, ...rest } = options

    this.name = name
    this.json = { ...json }
    this.required = required ?? false
    this.positional = positional ?? false
    this.complete = complete

    for (const [key, value] of Object.entries(rest)) if (value !== undefined) this.json[key] = value
    if (alias !== undefined) this.json['alias'] = alias
  }

  // ---------------- declare --------------------------
  static of<const N extends string, T = unknown, const O extends Arg.Options<T> = {}>(
    name: N,
    json: Schema.Json,
    options?: O,
  ): Arg<N, T, Arg.Present<O>> {
    return new Arg(name, json, options)
  }

  static string<const N extends string = '', const O extends Arg.Options<string> = {}>(
    name?: N,
    options?: O,
  ): Arg<N, string, Arg.Present<O>> {
    return new Arg((name ?? '') as N, { type: 'string' }, options)
  }

  static number<const N extends string = '', const O extends Arg.Options<number> = {}>(
    name?: N,
    options?: O,
  ): Arg<N, number, Arg.Present<O>> {
    return new Arg((name ?? '') as N, { type: 'number' }, options)
  }

  static integer<const N extends string = '', const O extends Arg.Options<number> = {}>(
    name?: N,
    options?: O,
  ): Arg<N, number, Arg.Present<O>> {
    return new Arg((name ?? '') as N, { type: 'integer' }, options)
  }

  /** Never consumes a following token; accepts `--no-` negation. */
  static boolean<const N extends string = '', const O extends Arg.Options<boolean> = {}>(
    name?: N,
    options?: O,
  ): Arg<N, boolean, Arg.Present<O>> {
    return new Arg((name ?? '') as N, { type: 'boolean' }, options)
  }

  static enum<
    const V extends readonly (string | number | boolean)[],
    const N extends string = '',
    const O extends Arg.Options<V[number]> = {},
  >(values: V, name?: N, options?: O): Arg<N, V[number], Arg.Present<O>> {
    return new Arg((name ?? '') as N, { enum: [...values] }, options)
  }

  /** Repeats as a flag (`--tag a --tag b`), or soaks up the remaining positionals. */
  static array<
    A extends Arg.Any,
    const N extends string = '',
    const O extends Arg.Options<Arg.Field<A>[keyof Arg.Field<A>][]> = {},
  >(items: A, name?: N, options?: O): Arg<N, Item<A>[], Arg.Present<O>> {
    return new Arg((name ?? '') as N, { type: 'array', items: items.json }, options) as Arg<N, Item<A>[], any>
  }

  /** A JSON literal, parsed from the token. */
  static json<T = unknown, const N extends string = '', const O extends Arg.Options<T> = {}>(
    name?: N,
    options?: O,
  ): Arg<N, T, Arg.Present<O>> {
    return new Arg((name ?? '') as N, { type: 'object' }, options)
  }

  /** Lift a property of an object schema, taking requiredness from its parent. */
  static from(name: string, json: Schema.Json, required = false): Arg.Any {
    const arg = new Arg(name, json)
    arg.required = required && json.default === undefined
    return arg
  }

  // ---------------- describe --------------------------
  get description(): string | undefined {
    return this.json.description
  }

  default(): unknown {
    return this.json.default
  }

  type(): string | undefined {
    const type = this.json.type
    return Array.isArray(type) ? type.find((entry) => entry !== 'null') : type
  }

  boolean(): boolean {
    return this.type() === 'boolean'
  }

  variadic(): boolean {
    return this.type() === 'array'
  }

  /** `enum`, or a union of `const` branches — TypeBox emits literal unions as `anyOf`. */
  choices(): unknown[] | undefined {
    return choices(this.json) ?? (this.json.items ? choices(this.json.items) : undefined)
  }

  /**
   * @example Arg.string('path', { complete: 'file' }).completion() // 'file'
   * @example Arg.enum(['dev', 'prod'], 'env').completion() // ['dev', 'prod']
   * @example Arg.boolean('force').completion() // ['true', 'false']
   */
  completion(): Arg.Complete | undefined {
    if (this.complete !== undefined) return this.complete

    const options = this.choices()
    if (options) return options.map(format)

    return this.boolean() ? ['true', 'false'] : undefined
  }

  aliases(): string[] {
    const raw = this.json['alias'] ?? this.json['short']
    if (typeof raw === 'string') return [raw]
    if (Array.isArray(raw)) return raw.filter((entry): entry is string => typeof entry === 'string')
    return []
  }

  flag(): string {
    return kebab(this.name)
  }

  matches(token: string): boolean {
    return token === this.name || token === this.flag() || this.aliases().includes(token)
  }

  // ---------------- render --------------------------
  /** How the arg is named in errors. */
  token(): string {
    return this.positional ? this.placeholder() : `--${this.flag()}`
  }

  placeholder(): string {
    const inner = this.variadic() ? `${this.flag()}...` : this.flag()
    return this.required ? `<${inner}>` : `[${inner}]`
  }

  hint(): string {
    const options = this.choices()
    const items = this.json.items?.type

    const inner = options
      ? options.map(format).join('|')
      : ((this.variadic() ? (Array.isArray(items) ? items[0] : items) : this.type()) ?? 'value')

    return this.variadic() ? `<${inner}...>` : `<${inner}>`
  }

  /** The left column of the options list. */
  label(): string {
    const names = [...this.aliases().map((alias) => `-${alias}`), `--${this.flag()}`].join(', ')
    return this.boolean() ? names : `${names} ${this.hint()}`
  }

  /** The right column: description, then defaults and requiredness. */
  summary(): string {
    const notes: string[] = []

    const fallback = this.default()
    if (fallback !== undefined) notes.push(`default: ${format(fallback)}`)

    const options = this.choices()
    if (options && this.positional) notes.push(`choices: ${options.map(format).join(', ')}`)

    if (this.required) notes.push('required')

    return [this.description, notes.length > 0 ? `(${notes.join(', ')})` : undefined].filter(Boolean).join(' ')
  }

  // ---------------- decode --------------------------
  /** Collected tokens to a typed value. Last one wins unless the arg is variadic. */
  decode(tokens: string[]): unknown {
    if (this.variadic()) return tokens.map((token) => this.coerce(this.json.items ?? {}, token))
    return this.coerce(this.json, tokens[tokens.length - 1]!)
  }

  /** `Coerce.token` decides; this only turns its expectation into the command-line message. */
  private coerce(json: Schema.Json, token: string): unknown {
    const result = coerceToken(json, token)
    if (!result.ok) throw this.invalid(token, result.error)
    return result.value
  }

  /** No `cmd` — `Parse` attaches it with `CliError.at` once it knows. */
  private invalid(token: string, expected: string): CliError {
    return new CliError(`Invalid value '${token}' for ${this.token()}: expected ${expected}`, { code: 'invalid-value' })
  }
}

// ---------------- H --------------------------
type Item<A> = A extends Arg<any, infer T, any> ? T : never

/** Re-exported so the cli surface is unchanged; both now live in `core` for the http layer. */
export { kebab, format } from '../core/text.ts'
