import type { Compute, Struct } from './util.ts'

/**
 * Path patterns, as a type and at runtime.
 *
 * The supported syntax is the *intersection* of what Elysia and Hono accept — `:name`, a
 * `{regex}` constraint, a trailing `?`, and a `*` catch-all — so one path literal is valid in
 * every adapter, including the fetch one that has to match it itself.
 *
 * @module
 */

/** Every parameter a literal path declares, required and optional alike. */
export type Keys<P extends string> = string extends P ? never : Name<Segment<P>>

/**
 * What the path contributes to a handler's input. Unlike `Keys`, an optional parameter stays
 * optional; a non-literal path widens to `Struct`, degrading the claim check to "no check"
 * rather than reporting every key as unbound.
 *
 * @example
 * ```ts
 * Shape<'/users/:id'> // { id: string }
 * Shape<'/u/:id?'>    // { id?: string }
 * Shape<'/files/*'>   // { '*'?: string }
 * ```
 */
export type Shape<P extends string> = string extends P
  ? Struct
  : Compute<{ [K in Name<Mandatory<P>>]: string } & { [K in Name<Optional<P>>]?: string }>

export type Segment<P extends string> = P extends `${infer H}/${infer R}` ? H | Segment<R> : P

export type Mandatory<P extends string> = Exclude<Segment<P>, Optional<P>>

/** Tested on the raw segment, so `:id{a?b}` — which ends in `}` — stays mandatory. */
export type Optional<P extends string> = Extract<Segment<P>, `${string}?` | '*'>

/** `:name`, minus a `{regex}` constraint and a trailing `?`. A bare `*` binds as `'*'`. */
export type Name<S extends string> = S extends `:${infer B}` ? Strip<B> : S extends '*' ? '*' : never

/** Peels the constraint before the marker, so `:id{\d+}?` reduces to `id`. */
export type Strip<S extends string> = S extends `${infer N}{${string}}${infer T}`
  ? Strip<`${N}${T}`>
  : S extends `${infer N}?`
    ? N
    : S

export interface Compiled {
  pattern: RegExp
  /** Capture-group order, so a match can be zipped back into named values. */
  names: string[]
}

const PARAM = /^:([A-Za-z_$][\w$]*)(\{.*\})?(\?)?$/

/**
 * A path pattern to a regular expression, built segment by segment so a static segment
 * carrying a regex metacharacter is escaped rather than silently becoming a wildcard.
 *
 * @example
 * ```ts
 * compile('/v1.0/:id').pattern.test('/v1X0/7') // false — the dot is literal
 * ```
 */
export const compile = (path: string): Compiled => {
  const names: string[] = []
  let source = ''

  for (const segment of path.split('/')) {
    if (segment === '') continue

    if (segment === '*') {
      names.push('*')
      source += '(?:/(.*))?'
      continue
    }

    const found = PARAM.exec(segment)
    if (!found) {
      source += `/${escape(segment)}`
      continue
    }

    const [, name = '', constraint, optional] = found
    names.push(name)

    const body = `(${constraint ? constraint.slice(1, -1) : '[^/]+'})`
    source += optional ? `(?:/${body})?` : `/${body}`
  }

  return { pattern: new RegExp(`^${source}/?$`), names }
}

/**
 * The parameters a pathname supplies, or `undefined` when it does not match. An unsupplied
 * optional is *omitted*, never `undefined`, so `required` and `default` behave as written.
 * The only place path values are decoded.
 *
 * @example
 * ```ts
 * match(compile('/orgs/:org'), '/orgs/a%20b') // { org: 'a b' }
 * match(compile('/u/:id?'), '/u') // {} — not { id: undefined }
 * match(compile('/orgs/:org'), '/nope') // undefined
 * ```
 */
export const match = (compiled: Compiled, pathname: string): Record<string, string> | undefined => {
  const found = compiled.pattern.exec(pathname)
  if (!found) return undefined

  const out: Record<string, string> = {}
  for (let index = 0; index < compiled.names.length; index += 1) {
    const value = found[index + 1]
    if (value !== undefined) out[compiled.names[index]!] = decodeURIComponent(value)
  }

  return out
}

/** The parameter names a pattern declares, in order. */
export const keys = (path: string): string[] => compile(path).names

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
