import { Schema } from '../core/index.ts'
import { kebab } from '../core/text.ts'
import { Path } from './path.ts'
import type { Compute, Struct } from './util.ts'

export declare namespace Route {
  type Node = Route<any, any, any, any, any, any>

  type Source = 'path' | 'query' | 'header' | 'cookie' | 'body' | 'raw'
  type Verb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  type Rest = 'query' | 'header' | 'cookie' | 'body'

  /**
   * The shape an `Api` node already has. Accepted anywhere a route is built, and read
   * structurally — so nothing here imports `Api`, and any object of this shape works. The
   * same contract `Cmd.Like` uses, for the same reason.
   */
  interface Like<I extends Struct = any, O = any, C extends Struct = any> {
    name: string
    description?: string | undefined
    in?: Schema.Type<I> | undefined
    out?: Schema.Type<O> | undefined
    handle?: ((input: I, context: C) => O | Promise<O>) | undefined
  }

  type In<M> = M extends Like<infer I, any, any> ? I : never
  type Out<M> = M extends Like<any, infer O, any> ? Awaited<O> : never
  type Context<M> = M extends Like<any, any, infer C> ? C : never

  /** Input keys a source claims, or a map from input key to the name on the wire. */
  type Claim = readonly string[] | Readonly<Record<string, string>>

  /**
   * How one method is exposed.
   *
   * Field order is claim priority — `path`, `query`, `header`, `cookie`, `raw`, `body` — and
   * `Check` narrows each one to what the fields above it left. That is what makes claiming a
   * key twice unrepresentable, which a builder chain would otherwise buy with an `Omit` per
   * link and a spec that can only be read back by replaying it.
   */
  interface Spec {
    method?: Verb
    path?: string
    query?: Claim
    header?: Claim
    cookie?: Claim
    raw?: Claim
    body?: Claim | true
    /** Where whatever no source claimed belongs. Silences the unbound-key error. */
    rest?: Rest
  }

  /** One resolved key: where it comes from, and under what name. */
  interface Binding {
    source: Source
    /** The wire name. Defaults to the key, or to `kebab(key)` for a header. */
    name: string
    /** Set when the fragment says `array`, so repeated values collect instead of overwriting. */
    array: boolean
  }

  type Bindings = Record<string, Binding>

  // ---------------- key algebra --------------------------

  /** A field of `S`, or `never` when absent — safer than `S['query']` on a generic. */
  type At<S, K extends PropertyKey> = S extends { readonly [P in K]: infer V } ? V : never

  /** The input keys a claim names, in either spelling. */
  type Listed<C> = C extends readonly string[]
    ? C[number]
    : C extends Readonly<Record<string, string>>
      ? Extract<keyof C, string>
      : never

  type Params<S> = Path.Keys<At<S, 'path'> & string>

  /** Keys still up for grabs once `Taken` is claimed. */
  type Free<I, Taken> = Exclude<Extract<keyof I, string>, Taken>

  /** Either spelling of a claim, restricted to `K`. */
  type Only<K extends string> = readonly K[] | { readonly [P in K]?: string }

  type Claimed<S> =
    Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>> | Listed<At<S, 'cookie'>> | Listed<At<S, 'raw'>>

  /**
   * Each source narrowed to the keys the sources above it left.
   *
   * **Advisory only.** These are what an editor offers as completions, and they document the
   * cascade — but a violated *optional* property is not reliably reported, so nothing here
   * fails a build. Every check that does is spelled as a required property: `Errors`,
   * `Conflicts`, `Strays`.
   */
  interface Check<I extends Struct, S> {
    query?: Only<Free<I, Params<S>>>
    header?: Only<Free<I, Params<S> | Listed<At<S, 'query'>>>>
    cookie?: Only<Free<I, Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>>>>
    raw?: Only<Free<I, Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>> | Listed<At<S, 'cookie'>>>>
    body?: Only<Free<I, Claimed<S>>> | true
  }

  /**
   * Where keys no source claimed end up: `rest`, or `body` when `body: true`.
   *
   * Tested as `[Src] extends [Sweep<S>]` at the use site, never the other way round — with no
   * sweep declared `Sweep<S>` is `never`, and `never extends Src` would land the remainder in
   * every source at once.
   */
  type Sweep<S> = [At<S, 'rest'>] extends [never] ? ([true] extends [At<S, 'body'>] ? 'body' : never) : At<S, 'rest'>

  type Unclaimed<I, S> = Free<I, Claimed<S> | Listed<At<S, 'body'>>>

  /** The input keys one source supplies, explicit claims plus the sweep when it lands here. */
  type Keys<I, S, Src extends Source> =
    | (Src extends 'path' ? Extract<Params<S>, keyof I> : never)
    | (Src extends 'query' ? Listed<At<S, 'query'>> : never)
    | (Src extends 'header' ? Listed<At<S, 'header'>> : never)
    | (Src extends 'cookie' ? Listed<At<S, 'cookie'>> : never)
    | (Src extends 'body' ? Listed<At<S, 'body'>> : never)
    | ([Src] extends [Sweep<S>] ? Unclaimed<I, S> : never)

  /** One source's share of the flat input, as the object a framework validates. */
  type Part<I, S, Src extends Source> = Compute<Pick<I, Extract<Keys<I, S, Src>, keyof I>>>

  /**
   * Drops the sources a route does not use, so a GET declares no `body`.
   *
   * Emptiness is `keyof`, not `{} extends T[K]`: the latter is true of any object whose keys
   * are all optional, which would silently drop a query that is entirely optional — the
   * commonest kind there is.
   */
  type Present<T> = { [K in keyof T as [keyof T[K]] extends [never] ? never : K]: T[K] }

  /** A path that is not a literal disables both checks rather than reporting every key. */
  type Loose<S> = string extends At<S, 'path'> & string ? true : false

  /**
   * Keys no source claimed.
   *
   * Both opt-outs are tested in the `true extends X` direction. Written the natural way round,
   * `At<S, 'body'> extends true` is *true* when the field is absent — the absent case is
   * `never`, and `never` is assignable to everything — which silently turns the whole check
   * off for the common spec that declares no body at all. Bracketing does not help: it stops
   * distribution, not `never`'s assignability.
   */
  type Unbound<I, S> =
    Loose<S> extends true
      ? never
      : [At<S, 'rest'>] extends [never]
        ? [true] extends [At<S, 'body'>]
          ? never
          : Free<I, Claimed<S> | Listed<At<S, 'body'>>>
        : never

  type Stray<I, S> = Loose<S> extends true ? never : Exclude<Params<S>, Extract<keyof I, string>>

  /**
   * Keys more than one source claims, as the same cascade `Check` reads for narrowing.
   *
   * `Check` narrows each slot to the keys still free, which is what an editor offers as
   * completions — but an *optional* property whose type is violated is not reported when it
   * comes from a self-referential constraint, so narrowing alone never fails a build. Only a
   * required property does, which is why the overlap is computed here and folded into
   * `Errors` rather than left to `Check`.
   */
  type Duplicated<S> =
    | Extract<Listed<At<S, 'query'>>, Params<S>>
    | Extract<Listed<At<S, 'header'>>, Params<S> | Listed<At<S, 'query'>>>
    | Extract<Listed<At<S, 'cookie'>>, Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>>>
    | Extract<
        Listed<At<S, 'raw'>>,
        Params<S> | Listed<At<S, 'query'>> | Listed<At<S, 'header'>> | Listed<At<S, 'cookie'>>
      >
    | Extract<Listed<At<S, 'body'>>, Claimed<S>>

  /**
   * Missing and impossible bindings, as required properties the caller cannot satisfy.
   *
   * The compiler prints a missing property's *name* verbatim, so putting the message there
   * gets one readable line per offending key. A terminal returning `never` names no key and
   * cascades into every downstream inference; a branded error object surfaces at the mount
   * site rather than here. The key union is `never` when the spec is complete, so a correct
   * route pays nothing.
   *
   * One mapped type over a precomputed union of messages, rather than two intersected mapped
   * types with `as` clauses: `S` appears in its own constraint, and TS calls a mapped type
   * whose *key* depends on `S` circular. Building the keys first keeps the constraint
   * resolvable — a template literal distributes over its union placeholder on its own.
   */
  type Errors<I extends Struct, S> = { [M in `bind '${Unbound<I, S>}' to a source, or set rest`]: Source }

  /** Each kept to one message template: two in a single mapped key resolves as circular. */
  type Conflicts<S> = { [M in `'${Duplicated<S>}' is claimed by more than one source`]: Source }

  type Strays<I, S> = { [M in `path declares ':${Stray<I, S>}', which the input has no key for`]: Source }
}

/**
 * One method, exposed over HTTP.
 *
 * Holds the binding table and nothing framework-specific: the adapters are free functions in
 * their own subpath modules, which is what keeps `http/index.ts` from ever reaching `elysia`
 * or `hono`.
 */
export class Route<
  I extends Struct = any,
  O = any,
  C extends Struct = {},
  P extends string = string,
  D extends Struct = {},
  S = Route.Spec,
> {
  node: Route.Like<I, O, C>
  method: Route.Verb
  path: P
  bindings: Route.Bindings
  rest: Route.Rest | undefined

  /** The input schema as JSON, read once — every fragment lookup goes through it. */
  json: Schema.Json

  private compiled: Path.Compiled | undefined

  /** Process-lifetime context, supplied by `with`. */
  context: Partial<C> = {}
  /** Per-request context, supplied by `from`. */
  supply: ((framework: any) => C | Promise<C>) | undefined

  /**
   * `S` sits in the return position on purpose. As a parameter it would make `Route`
   * invariant in the spec, so a route built from a literal spec would not be assignable to
   * `Route<…, Spec>` and every adapter signature would have to thread it explicitly.
   */
  declare readonly _types?: (input: I, context: C, framework: D) => [O, S]

  constructor(node: Route.Like<I, O, C>, spec: Route.Spec) {
    this.node = node
    this.method = spec.method ?? 'GET'
    this.path = (spec.path ?? `/${node.name}`) as P
    this.rest = spec.rest ?? (spec.body === true ? 'body' : undefined)
    this.json = node.in ? Schema.toJson(node.in) : {}
    this.bindings = bind(this.path, spec, this.json)
  }

  /** The JSON Schema fragment for one input key, which is what decides coercion. */
  fragment(key: string): Schema.Json | undefined {
    return this.json.properties?.[key]
  }

  match(pathname: string): Record<string, string> | undefined {
    this.compiled ??= Path.compile(this.path)
    return Path.match(this.compiled, pathname)
  }

  keys(source: Route.Source): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [key, binding] of Object.entries(this.bindings)) if (binding.source === source) out[key] = binding.name
    return out
  }

  /** Values known at build time: a pool, a client. Captured is correct for these. */
  with(context: C): this {
    this.context = { ...this.context, ...context }
    return this
  }

  /**
   * Per-request context, read off the framework's own.
   *
   * `D` is taken from the callback's parameter annotation and lands on the adapter's handler
   * type, so a missing decoration is reported by the framework at the `.get()` call — against
   * the app that actually has them — rather than here, where nothing knows what the app is.
   */
  from<const D2 extends Struct>(supply: (framework: D2) => C | Promise<C>): Route<I, O, C, P, Compute<D & D2>, S> {
    this.supply = supply as (framework: any) => C | Promise<C>
    return this as any
  }

  /** Declares what the framework must provide, without supplying it. Mirrors `Cmd.context`. */
  needs<T extends Struct>(): Route<I, O, C, P, Compute<D & T>, S> {
    return this as any
  }
}

/**
 * Resolve every input key to a source.
 *
 * Explicit claims win, then a fragment's own `x-in` (so a schema authored with marking helpers
 * works without repeating itself here), then `rest`. Anything still unclaimed is left out — the
 * type error has already been reported, and inventing a source at runtime would only hide it.
 */
const bind = (path: string, spec: Route.Spec, json: Schema.Json): Route.Bindings => {
  const bindings: Route.Bindings = {}
  const properties = json.properties ?? {}

  const claim = (source: Route.Source, key: string, name: string) => {
    if (key in bindings) return
    bindings[key] = { source, name, array: isArray(properties[key]) }
  }

  for (const name of Path.keys(path)) claim('path', name, name)

  for (const source of ['query', 'header', 'cookie', 'raw', 'body'] as const) {
    const declared = spec[source]
    if (declared === undefined || declared === true) continue

    if (Array.isArray(declared)) for (const key of declared) claim(source, key, wire(source, key))
    else for (const [key, name] of Object.entries(declared)) claim(source, key, name)
  }

  for (const key of Object.keys(properties)) {
    if (key in bindings) continue

    const declared = properties[key]?.['x-in']
    const source =
      typeof declared === 'string'
        ? (declared as Route.Source)
        : (spec.rest ?? (spec.body === true ? 'body' : undefined))
    if (source) claim(source, key, wire(source, key))
  }

  return bindings
}

/** A header's wire name is kebab-cased; every other source uses the key as written. */
const wire = (source: Route.Source, key: string): string => (source === 'header' ? kebab(key) : key)

const isArray = (json: Schema.Json | undefined): boolean => {
  if (!json) return false
  if (json.type === 'array' || (Array.isArray(json.type) && json.type.includes('array'))) return true

  const branches = json.oneOf ?? json.anyOf
  return branches?.some((branch) => branch.type === 'array') ?? false
}

/**
 * Expose a method over HTTP.
 *
 * Every check reaches the caller as a **required property it cannot supply**, whose *name* is
 * the message — the compiler prints a missing property's name verbatim, so one unbound key
 * gets one readable line. Nothing relies on narrowing an optional property: a violated
 * optional is reported neither from `S`'s constraint nor from this intersection, whereas a
 * missing required one is reported from both. `Check` is intersected here for completions, and
 * is deliberately not load-bearing.
 *
 * The checks stay out of `S`'s own constraint, which would make it self-referential: TS calls
 * a mapped type whose key depends on `S` circular as soon as `S extends …` mentions it.
 */
export const route = <I extends Struct, O, C extends Struct, const S extends Route.Spec>(
  node: Route.Like<I, O, C>,
  spec: S & Route.Check<I, S> & Route.Errors<I, S> & Route.Conflicts<S> & Route.Strays<I, S>,
): Route<I, Awaited<O>, C, At<S, 'path'> & string extends never ? string : At<S, 'path'> & string, {}, S> =>
  new Route(node, spec as Route.Spec) as any

type At<S, K extends PropertyKey> = S extends { readonly [P in K]: infer V } ? V : never
