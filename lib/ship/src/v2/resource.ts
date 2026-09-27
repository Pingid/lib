import type * as D from './types.d.ts'

/** The compose definition each resource kind produces. */
export interface Def {
  service: D.DefinitionsService
  network: D.DefinitionsNetwork
  volume: D.DefinitionsVolume
  secret: D.DefinitionsSecret
  config: D.DefinitionsConfig
}

export type Kind = keyof Def

/** Compose's own top-level order, so generated files read like hand-written ones. */
const KINDS = ['service', 'network', 'volume', 'secret', 'config'] as const satisfies readonly Kind[]

/** Brands are `Symbol.for` keys so a second copy of this module (jiti, bundlers) still agrees. */
const RESOURCE: unique symbol = Symbol.for('@pingid/lib/ship:Resource')
const COMPOSE: unique symbol = Symbol.for('@pingid/lib/ship:Compose')

/** Type-only: carries a compose file's context requirement. Nothing sets it at runtime. */
declare const CONTEXT: unique symbol

// ---------------- resource --------------------------

/**
 * One compose resource: a key, and a function from the context it needs to its definition.
 *
 * `def` is a method so it is bivariant: a resource needing `{ image: string }` is still a
 * `Resource`, and the context it needs can still be inferred from it.
 */
export interface Resource<
  K extends Kind = Kind,
  N extends string = string,
  S extends Def[K] = Def[K],
  C extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly [RESOURCE]: true
  readonly type: K
  readonly name: N
  def(cx: C, name: N): S | Promise<S>
}

const isResource = (value: unknown): value is Resource =>
  typeof value === 'object' && value !== null && RESOURCE in value

const factory =
  <K extends Kind>(type: K) =>
  <const N extends string, C extends Record<string, unknown> = {}, S extends Def[K] = Def[K]>(
    name: N,
    def: (cx: C, name: N) => S | Promise<S>,
  ): Resource<K, N, S, C> =>
    Object.freeze({ [RESOURCE]: true as const, type, name, def })

export const Service = factory('service')
export type Service<
  N extends string = string,
  S extends Def['service'] = Def['service'],
  C extends Record<string, unknown> = Record<string, unknown>,
> = Resource<'service', N, S, C>

export const Network = factory('network')
export type Network<
  N extends string = string,
  S extends Def['network'] = Def['network'],
  C extends Record<string, unknown> = Record<string, unknown>,
> = Resource<'network', N, S, C>

export const Volume = factory('volume')
export type Volume<
  N extends string = string,
  S extends Def['volume'] = Def['volume'],
  C extends Record<string, unknown> = Record<string, unknown>,
> = Resource<'volume', N, S, C>

export const Secret = factory('secret')
export type Secret<
  N extends string = string,
  S extends Def['secret'] = Def['secret'],
  C extends Record<string, unknown> = Record<string, unknown>,
> = Resource<'secret', N, S, C>

export const Config = factory('config')
export type Config<
  N extends string = string,
  S extends Def['config'] = Def['config'],
  C extends Record<string, unknown> = Record<string, unknown>,
> = Resource<'config', N, S, C>

// ---------------- compose --------------------------

/** Anything a compose file lists: a resource, or another compose file to include whole. */
export type Item = Resource<Kind, any, any, any> | Compose<any, any, any>

/** The resources an item contributes. */
type Local<I> = I extends Compose<infer R, any, any> ? R : I extends Resource<any, any, any, any> ? I : never

/** Keyed by name when the resources are known; any name when this is just `Compose`. */
type Group<R extends Resource, K extends Kind> = Resource extends R
  ? { readonly [name: string]: Resource<K> }
  : { readonly [P in Extract<R, { type: K }> as P['name']]: P }

type Groups<R extends Resource> = { readonly [K in Kind as `${K}s`]: Group<R, K> }

/** A compose file: its project name, its resources, and those resources grouped by kind. */
export type Compose<R extends Resource = Resource, N extends string = string, C = {}> = Groups<R> & {
  readonly [COMPOSE]: true
  readonly name: N
  /** Every resource, with included compose files flattened in. */
  readonly items: readonly Resource[]
  /** A method, like `Resource.def`, so a compose file needing context is still a `Compose`. */
  [CONTEXT]?(cx: C): void
}

const isCompose = (value: unknown): value is Compose => typeof value === 'object' && value !== null && COMPOSE in value

type ContextOf<I> = I extends Item
  ? I extends Resource<any, any, any, infer C>
    ? C
    : I extends Compose<any, any, infer C>
      ? C
      : never
  : never

type Cx<I> = Compute<Intersect<ContextOf<I>>>
export const Compose = <const N extends string, const I extends readonly Item[]>(
  name: N,
  items: I,
): Compose<Local<I[number]>, N, Cx<I[number]>> => {
  const flat: Resource[] = []
  const groups: Record<string, Record<string, Resource>> = Object.fromEntries(KINDS.map((k) => [`${k}s`, {}]))

  for (const r of items.flatMap((item): readonly unknown[] => (isCompose(item) ? item.items : [item]))) {
    if (!isResource(r)) throw new TypeError(`${name}: expected a Resource or Compose, got ${typeof r}`)
    const group = groups[`${r.type}s`]!
    // The same resource listed twice is one entry; two resources on one key is a mistake.
    if (group[r.name] === r) continue
    if (group[r.name]) throw new Error(`${name}: two different resources are both ${r.type}.${r.name}`)
    group[r.name] = r
    flat.push(r)
  }

  return Object.freeze({ [COMPOSE]: true, name, items: flat, ...groups }) as unknown as Compose<
    Local<I[number]>,
    N,
    Cx<I[number]>
  >
}

// ---------------- resolve --------------------------

type Intersect<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never
type Compute<T> = { [K in keyof T]: T[K] } & {}
/** A compose file. `name` is the project name, which the generated types predate. */
export type Spec = D.ComposeSpecification & { name: string }

/** Evaluate every definition into a plain compose file — `JSON.stringify` it and it is valid YAML. */
export const Resolve = async <C>(compose: Compose<any, any, C>, cx: C): Promise<Spec> => {
  const values = await Promise.all(
    compose.items.map(async (r) => {
      try {
        return await r.def(cx as Record<string, unknown>, r.name)
      } catch (cause) {
        throw new Error(
          `${compose.name}: ${r.type}.${r.name}: ${cause instanceof Error ? cause.message : String(cause)}`,
          { cause },
        )
      }
    }),
  )

  const groups: Record<string, unknown> = {}
  for (const kind of KINDS) {
    const entries = compose.items.flatMap((r, i) => (r.type === kind ? [[r.name, values[i]] as const] : []))
    if (entries.length > 0) groups[`${kind}s`] = Object.fromEntries(entries)
  }
  return { name: compose.name, ...groups }
}
