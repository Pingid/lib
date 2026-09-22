import type { Table } from './table.ts'

export declare namespace Script {
  interface Options {
    /** Binary the script registers against. */
    name: string
    /** Words to exec for a callback. Undefined emits a script that never calls back. */
    invoke?: string[] | undefined
  }
}

/** @example words('bun /app/cli.ts') // ['bun', '/app/cli.ts'] */
export const words = (value: string | readonly string[]): string[] =>
  typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : [...value]

/** Collapse whitespace, so a description can never break the tab-separated wire. */
export const clean = (value: string | undefined): string | undefined => {
  const text = value?.replace(/\s+/g, ' ').trim()
  return text ? text : undefined
}

/** A shell function name: `my-app` -> `my_app`. */
export const slug = (name: string): string => name.replace(/[^A-Za-z0-9_]/g, '_')

/** @example quote("it's") // "'it'\\''s'" */
export const quote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`

/** fish only honours `\\` and `\'` inside single quotes. */
export const escape = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

export const key = (path: string[]): string => path.join(' ')

/** Flags the walk must skip a token for. */
export const takes = (entry: Table.Entry): string[] => entry.flags.filter((flag) => flag.takes).flatMap((f) => f.names)

/** Every non-kebab command spelling in the tree, paired with the canonical one. */
export const aliases = (entries: Table.Entry[]): [string, string][] => {
  const seen = new Map<string, string>()
  for (const entry of entries) for (const [from, to] of entry.aliases) seen.set(from, to)
  return [...seen]
}

/** Every flag spelling, long forms first. */
export const names = (entry: Table.Entry): string[] => entry.flags.flatMap((flag) => flag.names)

/**
 * Value specs keyed as the drivers look them up: a flag by each of its spellings, a
 * positional by slot.
 *
 * @example specs(entry) // [[['--env', '-e'], ['dev', 'prod']], [['@0'], 'file']]
 */
export const specs = (
  entry: Table.Entry,
): [keys: string[], spec: Exclude<Table.Entry['positionals'][number], undefined>][] => {
  const out: [string[], NonNullable<Table.Entry['positionals'][number]>][] = []

  for (const flag of entry.flags) if (flag.takes && flag.spec !== undefined) out.push([flag.names, flag.spec])
  for (const [index, spec] of entry.positionals.entries()) if (spec !== undefined) out.push([[`@${index}`], spec])

  return out
}
