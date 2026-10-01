/**
 * Typed, lazily-built wrappers for command-line programs.
 *
 * ```ts
 * const git = cli('git')
 * const CommitOpts = { message: value(), amend: flag(), no_verify: flag() }
 * export const commit = git(['commit'], CommitOpts)
 *
 * await commit({ cwd }).message('wip').amend()   // git commit --message wip --amend
 * commit.argv({ message: 'wip' })                // ['git', 'commit', '--message', 'wip']
 * ```
 *
 * A spec declares how each option renders; the builder gets one method per option plus one
 * per {@link ShellOptions} key (`cwd`, `env`, `timeout`, …), and runs the command once, when
 * it is first awaited.
 */
import { Shell } from '../shell/index.ts'

export type Command<S extends Spec, R> = {
  (init?: Values<S> & Shell.ShellOptions): Builder<S, R>
  /** The full argv a set of values renders to, without running anything. */
  argv(values?: Values<S>): string[]
  /** The spec the command was built from. */
  readonly spec: S
}

export type CliConfig = {
  /** Arguments placed before every subcommand, e.g. `['--no-pager']`. */
  args?: string[]
  /** Shell options every command starts from. `env` is merged with a command's own. */
  shell?: Shell.ShellOptions
}

type State = Record<string, unknown>

/**
 * Bind a program, returning a factory for its commands: `factory(params, spec, mode?)`.
 * `params` is the fixed prefix (`['commit']`, `['remote', 'add']`); `mode` picks the
 * {@link Shell} runner — `sho` (stdout, throws on failure) by default — or takes a {@link Runner}.
 */
export const cli =
  (program: string, config: CliConfig = {}) =>
  <S extends Spec, M extends Mode | Runner<unknown> = 'sho'>(
    params: string[],
    spec: S & NoReserved,
    mode?: M,
  ): Command<S, Output<M>> => {
    for (const key of Object.keys(spec)) {
      if (RESERVED.has(key)) {
        throw new TypeError(
          `${[program, ...params].join(' ')}: "${key}" is reserved; use another key and set the switch with name, e.g. value('--${key}')`,
        )
      }
    }

    const run = (typeof mode === 'function' ? mode : RUNNERS[(mode ?? 'sho') as Mode]) as Runner<Output<M>>
    const prefix = [...(config.args ?? []), ...params]
    const methods: ReadonlySet<string> = new Set([...Object.keys(spec), ...Object.keys(CONTEXT)])

    // `.amend()` reads as "amend", so a flag called without an argument means `true`.
    const fold = (state: State, key: string, v: unknown): State => ({
      ...state,
      [key]: v === undefined && Object.hasOwn(spec, key) && spec[key]!.kind === 'flag' ? true : v,
    })

    const execute = (state: State) => {
      const shell: State = { ...config.shell }
      for (const key of Object.keys(CONTEXT)) if (state[key] !== undefined) shell[key] = state[key]
      if (config.shell?.env && state['env']) shell['env'] = { ...config.shell.env, ...(state['env'] as object) }
      return run(program, [...prefix, ...to_args(spec, state as Values<S>)], shell as Shell.ShellOptions)
    }

    const build = (state: State): Builder<S, Output<M>> => {
      let pending: Promise<Output<M>> | undefined
      // The executor form turns a custom runner's synchronous throw into a rejection.
      const once = () => (pending ??= new Promise((resolve) => resolve(execute(state))))

      return new Proxy(Object.create(null), {
        get: (_, prop) => {
          if (typeof prop !== 'string') return undefined
          if ((THEN as readonly string[]).includes(prop)) {
            const p = once() as unknown as Record<string, Function>
            return p[prop]!.bind(p)
          }
          if (!methods.has(prop)) return undefined
          return (v?: unknown) => build(fold(state, prop, v))
        },
      })
    }

    const command = (init: Values<S> & Shell.ShellOptions = {} as Values<S> & Shell.ShellOptions) => build({ ...init })
    return Object.assign(command, {
      argv: (values: Values<S> = {}) => [program, ...prefix, ...to_args(spec, values)],
      spec: spec as S,
    })
  }

/**
 * The builder: awaitable, plus one method per option and per shell option. Each call returns a
 * new builder, so branching off an earlier link leaves it untouched, and awaiting the same
 * builder twice runs the command once.
 */
export type Builder<S extends Spec, R> = Promise<R> & {
  readonly [K in keyof S]: Method<S[K], Builder<S, R>>
} & {
  readonly [K in keyof Shell.ShellOptions]-?: (value: Shell.ShellOptions[K]) => Builder<S, R>
}

// ─── Specs ──────────────────────────────────────────────────────────────────────────────

/**
 * How an option is rendered on the command line.
 *
 * - `flag`: `--name`, emitted when `true` and omitted otherwise.
 * - `value`: `--name <value>` (or `--name=<value>`), repeated for each element of an array.
 * - `positional`: an operand, emitted after every switch, in declaration order.
 */
export type Kind = 'flag' | 'value' | 'positional'

export type Arg<K extends Kind = Kind, T = unknown> = {
  readonly kind: K
  /** The literal switch, when it is not `--` plus the key with `_` turned into `-`. */
  readonly name?: string
  /** `value` only: render as `--name=<value>` rather than two arguments. */
  readonly eq?: boolean
  /** `positional` only: emit `--` before this operand, so a value starting with `-` stays an operand. */
  readonly dashdash?: boolean
  /** Phantom carrier for the value type; never present at runtime. */
  readonly __type?: T
}

/** A set of options, keyed by the name the builder method and value object use. */
export type Spec = Record<string, Arg>

type Scalar = string | number

/** A boolean switch. In the builder, `.amend()` means `.amend(true)`. */
export const flag = (name?: string): Arg<'flag', boolean> => ({ kind: 'flag', name })

/** A switch that carries a value, e.g. `--message <msg>`. An array type repeats the switch. */
export const value = <T extends Scalar | Scalar[] = string>(
  name?: string,
  options: { eq?: boolean } = {},
): Arg<'value', T> => ({ kind: 'value', name, ...options })

/** An operand, e.g. the `<name>` in `git tag <name>`. An array type spreads into several. */
export const positional = <T extends Scalar | Scalar[] = string>(
  options: { dashdash?: boolean } = {},
): Arg<'positional', T> => ({ kind: 'positional', ...options })

type TypeOf<A> = A extends Arg<Kind, infer T> ? T : never

/** The value object behind a spec. Every option may be left out. */
export type Values<S extends Spec> = { [K in keyof S]?: TypeOf<S[K]> }

// ─── Rendering ──────────────────────────────────────────────────────────────────────────

const switch_of = (key: string, arg: Arg) => arg.name ?? `--${key.replace(/_/g, '-')}`

/**
 * Render a value object as argv. Iterates the *spec* rather than the values, so the order is
 * stable and keys the spec doesn't declare (`cwd`, anything a caller invented) never leak in.
 * `undefined`, `null` and `false` all mean "leave it out".
 */
export const to_args = <S extends Spec>(spec: S, values: Values<S>): string[] => {
  const switches: string[] = []
  const operands: string[] = []
  let separated = false

  for (const [key, arg] of Object.entries(spec)) {
    const v = (values as Record<string, unknown>)[key]
    if (v === undefined || v === null || v === false) continue
    const list = (Array.isArray(v) ? v : [v]).map(String)

    if (arg.kind === 'flag') {
      switches.push(switch_of(key, arg))
    } else if (arg.kind === 'value') {
      const sw = switch_of(key, arg)
      for (const x of list) arg.eq ? switches.push(`${sw}=${x}`) : switches.push(sw, x)
    } else if (list.length) {
      if (arg.dashdash && !separated) operands.push('--')
      separated ||= !!arg.dashdash
      operands.push(...list)
    }
  }

  return [...switches, ...operands]
}

// ─── Commands ───────────────────────────────────────────────────────────────────────────

/** Every shell option is also settable on a command, so none can be an option name. */
const CONTEXT: Record<keyof Shell.ShellOptions, true> = {
  cwd: true,
  env: true,
  input: true,
  stdio: true,
  timeout: true,
  signal: true,
}

/** Promise methods the builder forwards rather than treating as options. */
const THEN = ['then', 'catch', 'finally'] as const

type Reserved = keyof Shell.ShellOptions | (typeof THEN)[number]
const RESERVED: ReadonlySet<string> = new Set([...Object.keys(CONTEXT), ...THEN])

/** Makes a spec that uses a reserved name a type error, not just a runtime one. */
type NoReserved = { [K in Reserved]?: never }

/** What each {@link Shell} runner resolves with. */
type Outputs = { sho: string; sh: Shell.ShellResult; run: Shell.ShellResult; ok: boolean; io: Shell.ShellResult }

/** A {@link Shell} runner by name: what the command resolves with, and whether it throws. */
export type Mode = keyof Outputs

const RUNNERS = {
  sho: Shell.sho,
  sh: Shell.sh,
  run: Shell.run,
  ok: Shell.ok,
  io: Shell.io,
} satisfies { [M in Mode]: Shell.ShellMacro<Outputs[M]> }

/** A custom way to run the rendered command. */
export type Runner<R> = (cmd: string, args: string[], options: Shell.ShellOptions) => Promise<R>

type Output<M> = M extends Mode ? Outputs[M] : M extends Runner<infer R> ? R : never

type Method<A, Self> = A extends Arg<'flag'> ? (on?: boolean) => Self : (value: TypeOf<A>) => Self
