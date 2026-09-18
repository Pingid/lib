import type { Context, ContextValue } from './context.ts'
import type * as D from './types.d.ts'
import { branded } from './brand.ts'

export interface Definitions {
  service: D.DefinitionsService
  network: D.DefinitionsNetwork
  volume: D.DefinitionsVolume
  secret: D.DefinitionsSecret
  config: D.DefinitionsConfig
}

export type ResourceType = keyof Definitions

/** Resource types that carry a `name` field and can therefore be shared across stacks. */
export type ShareableType = Exclude<ResourceType, 'service'>

export const RESOURCE_TYPES = [
  'service',
  'network',
  'volume',
  'secret',
  'config',
] as const satisfies readonly ResourceType[]

export type AnyResource = Resource<ResourceType, any, any, any>

/** Anything `compose()` or `stack()` accepts. */
export type Item = ContextValue<any> | AnyResource

/**
 * Structural view of a `Stack`, declared here so `Ctx` can reference one without
 * `resource.ts` importing `stack.ts`.
 */
export interface StackRef {
  readonly name: string
  readonly items: readonly Item[]
}

export interface Use {
  <T>(ref: Context<T>): T
  <T extends ResourceType, N extends string, O>(ref: Resource<T, N, O, any>): O
}

export interface Ref {
  <T extends ShareableType, N extends string>(stack: StackRef, ref: Resource<T, N, any, any>): { name: N }
}

export interface Ctx<N extends string, O> {
  /** This resource's key — its DNS name for services, its map key otherwise. */
  readonly name: N
  /** This resource's own out handle, for self-reference. */
  readonly out: O
  /** Pull in a context value, or a resource in this same stack (registering it if needed). */
  readonly use: Use
  /** Reference a `.shared()` resource belonging to another stack; emits an `external` stub here. */
  readonly ref: Ref
}

export type Init<S, C> = (c: C) => S | Promise<S>

const RESOURCE: unique symbol = Symbol.for('@pingid/lib-compose:Resource')

/**
 * A single compose resource.
 *
 * Builder methods are pure — each returns a new `Resource`. The object you pass to
 * `compose()` / `stack()` / `use()` is the identity used for deduplication, so always
 * pass the end of the chain.
 */
export class Resource<T extends ResourceType, N extends string, O = { name: N }, S = undefined> {
  /** @see {@link branded} */
  readonly [RESOURCE] = true
  static [Symbol.hasInstance] = branded(RESOURCE)

  static service<const N extends string>(name: N): Resource<'service', N> {
    return new Resource('service', name)
  }
  static network<const N extends string>(name: N): Resource<'network', N> {
    return new Resource('network', name)
  }
  static volume<const N extends string>(name: N): Resource<'volume', N> {
    return new Resource('volume', name)
  }
  static secret<const N extends string>(name: N): Resource<'secret', N> {
    return new Resource('secret', name)
  }
  static config<const N extends string>(name: N): Resource<'config', N> {
    return new Resource('config', name)
  }

  readonly type: T

  protected _name: N
  protected _out: O
  protected _spec: Init<unknown, Ctx<N, O>>
  protected _shared: string | undefined

  constructor(type: T, name: N) {
    this.type = type
    this._name = name
    this._out = {} as O
    this._spec = () => ({})
    this._shared = undefined
  }

  /** @internal */
  static meta(r: AnyResource): {
    type: ResourceType
    name: string
    spec: Init<unknown, Ctx<string, any>>
    shared: string | undefined
  } {
    return { type: r.type, name: r._name, spec: r._spec, shared: r._shared }
  }

  /** @internal The value `use()` hands back: the declared out, plus the resource key. */
  static handle(r: AnyResource): Record<string, unknown> {
    return { ...(r._out as Record<string, unknown>), name: r._name }
  }

  protected derive(patch: { out?: unknown; spec?: unknown; shared?: string }): any {
    const next = new Resource(this.type, this._name)
    next._out = (patch.out ?? this._out) as any
    next._spec = (patch.spec ?? this._spec) as Init<unknown, Ctx<any, any>>
    next._shared = patch.shared ?? this._shared
    return next
  }

  /** Define the resource body. Call `.out()` first if the body needs to read its own handle. */
  spec<S2 extends Definitions[T]>(spec: Init<S2, Ctx<N, O>>): Resource<T, N, O, S2> {
    return this.derive({ spec })
  }

  /** Declare extra fields other resources see through `use()`. Always includes `name`. */
  out<const O2 extends Record<string, unknown>>(out: O2): Resource<T, N, O2 & { name: N }, S> {
    return this.derive({ out })
  }

  /** Layer an override on top of the existing body — environment overlays without forking. */
  patch(f: (def: S, c: Ctx<N, O>) => S | Promise<S>): Resource<T, N, O, S> {
    const prev = this._spec
    return this.derive({ spec: async (c: Ctx<N, O>) => f((await prev(c)) as S, c) })
  }

  /**
   * Pin this resource's docker object name so other stacks can reference it.
   *
   * Compose prefixes the project name onto network/volume names, so a shared object must
   * pin `name:` explicitly or the `external` reference in the consuming stack cannot be
   * reconstructed reliably. Services cannot be shared this way — they have no `name` field.
   */
  shared(this: Resource<ShareableType, N, O, S>, dockerName?: string): Resource<T, N, O, S> {
    // Recorded as metadata rather than wrapped into the body, so a later `.spec()` cannot
    // replace the body and silently drop the pinned name.
    return this.derive({ shared: dockerName ?? this._name })
  }
}
