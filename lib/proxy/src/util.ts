export const trimEnd = (p: string) => p.replace(/\/+$/, '')
export const underPrefix = (path: string, prefix: string) =>
  prefix !== '' && (path === prefix || path.startsWith(`${prefix}/`))

export type Pattern = string | RegExp
export type PatternArg = Pattern | readonly Pattern[]

export function matchesAny(patterns: readonly Pattern[], value: string): boolean {
  return patterns.some((p) => {
    if (typeof p === 'string') return p === value
    p.lastIndex = 0 // guard against stateful /g and /y regexes
    return p.test(value)
  })
}
