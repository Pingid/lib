import { Recipe, Shell, type RecipeApi, type ShellOptions } from '../../util/index.ts'

/**
 * How an option is rendered on the command line.
 *
 * - `flag`: `--name`, emitted when set to `true` and omitted otherwise.
 * - `value`: `--name <value>`.
 * - `positional`: an operand, appended after every option in declaration order.
 */
export type ArgKind = 'flag' | 'value' | 'positional'

export type Arg<K extends ArgKind = ArgKind, T = unknown> = {
  kind: K
  /** The literal switch, when it is not the option name with `_` turned into `-`. */
  name?: string
  /** Phantom carrier for the value type; never read. */
  value: T
}

export type Args = Record<string, Arg>

const spec = <K extends ArgKind, T>(kind: K, name?: string): Arg<K, T> => ({ kind, name, value: undefined as T })

/** A boolean switch. Optional in the builder, where `.amend()` means `.amend(true)`. */
export const flag = (name?: string): Arg<'flag', boolean> => spec('flag', name)

/** A switch that carries a value, e.g. `--message <msg>`. */
export const value = <T extends string | number = string>(name?: string): Arg<'value', T> => spec('value', name)

/** An operand, e.g. the `<name>` in `git tag <name>`. Emitted after the switches. */
export const positional = <T extends string | number | string[] = string>(): Arg<'positional', T> => spec('positional')

type FlagKeys<T extends Args> = { [K in keyof T]: T[K]['kind'] extends 'flag' ? K : never }[keyof T]

/** The value object behind a set of {@link Args}: flags optional, everything else required. */
export type Values<T extends Args> = { [K in FlagKeys<T>]?: T[K]['value'] } & {
  [K in Exclude<keyof T, FlagKeys<T>>]: T[K]['value']
}

/** Options every git command accepts, independent of the subcommand. */
export type SharedOpts = { cwd?: string }

const switch_of = (key: string, arg: Arg) => arg.name ?? `--${key.replace(/_/g, '-')}`

/**
 * Render a value object as argv, iterating the *declaration* rather than the values so the
 * order is stable and unknown keys (`cwd`, anything a caller invented) can never leak into
 * the command line.
 */
export const to_args = <T extends Args>(options: T, values: Partial<Values<T>>): string[] => {
  const flags: string[] = []
  const operands: string[] = []

  for (const [key, arg] of Object.entries(options)) {
    const value = (values as Record<string, unknown>)[key]
    if (value === undefined || value === null || value === false) continue
    if (arg.kind === 'flag') flags.push(switch_of(key, arg))
    else if (arg.kind === 'positional') operands.push(...(Array.isArray(value) ? value.map(String) : [String(value)]))
    else flags.push(switch_of(key, arg), String(value))
  }

  return [...flags, ...operands]
}

export type Command<T extends Args> = (
  init?: Partial<Values<T>> & SharedOpts,
) => RecipeApi<Values<T> & SharedOpts, string>

/**
 * Turn a subcommand and its options into a lazy builder: `commit({ cwd }).message('x').amend()`
 * runs `git commit --message x --amend` in `cwd` and resolves with its stdout.
 */
export const recipe =
  <T extends Args>(params: string[], options: T): Command<T> =>
  (init) =>
    Recipe.create<Values<T> & SharedOpts, string>(
      {
        // `cwd` is shell context rather than an argument, so it is settable but never rendered.
        options: { ...options, cwd: undefined } as { [K in keyof (Values<T> & SharedOpts)]: unknown },
        resolve: (opts, key, value) => {
          // `.amend()` reads as "amend", so a flag with no argument means `true`.
          const arg = (options as Args)[key as string]
          const set = value === undefined && arg?.kind === 'flag' ? true : value
          return { ...opts, [key]: set }
        },
        execute: ({ cwd, ...rest }: Partial<Values<T> & SharedOpts>) =>
          Shell.sho('git', [...params, ...to_args(options, rest as Partial<Values<T>>)], { cwd } as ShellOptions),
      },
      init,
    )
