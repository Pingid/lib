import type { AnyResource, Ctx, Definitions, Item, Ref, ResourceType, StackRef, Use } from './resource.ts'
import { Resource, RESOURCE_TYPES } from './resource.ts'
import type { ComposeSpecification } from './types.d.ts'
import { ContextValue, Context } from './context.ts'
import { Scope } from './scope.ts'

/** A compose file. `name` is the project name, which the generated types predate. */
export type Spec = ComposeSpecification & { name?: string }

type Entry = {
  type: ResourceType
  name: string
  value: Promise<unknown>
  origin: 'local' | 'external'
  externalName?: string
}

/**
 * Collects resources for a single compose file.
 *
 * Registration is idempotent and keyed on resource identity, so a resource pulled in by
 * three different services is built once. Two distinct resources claiming the same
 * `type.name` is an error rather than a silent overwrite.
 */
export class Registry {
  /** Names of other stacks this one referenced via `ref()`. */
  readonly dependsOn = new Set<string>()

  /** The stack this registry is building, when there is one. Lets `ref()` spot a self-reference. */
  self: StackRef | undefined

  private readonly scope: Scope
  private readonly entries = new Map<string, Entry>()
  private readonly owners = new Map<string, AnyResource | null>()

  constructor(scope: Scope) {
    this.scope = scope
  }

  /** Register every item, context values first so `use()` never depends on argument order. */
  registerAll(items: readonly Item[]): void {
    for (const item of items) if (item instanceof ContextValue) this.register(item)
    for (const item of items) if (!(item instanceof ContextValue)) this.register(item)
  }

  register(item: Item): unknown {
    if (item instanceof ContextValue) {
      this.scope.setContext(item.context, item.value)
      return undefined
    }
    if (!(item instanceof Resource)) {
      throw new TypeError('expected a Resource or a Context value')
    }
    if (this.scope.hasHandle(item)) return this.scope.getHandle(item)

    const meta = Resource.meta(item)
    const key = `${meta.type}.${meta.name}`
    this.claim(key, item)

    const handle = Resource.handle(item)
    this.scope.setHandle(item, handle)

    const ctx: Ctx<string, any> = { name: meta.name, out: handle, use: this.use, ref: this.ref }
    const value = (async () => {
      const definition = await meta.spec(ctx)
      // A `.shared()` resource pins its docker name here rather than inside the body, so the
      // pin survives whatever order the builder was chained in.
      return meta.shared ? { ...(definition as object), name: meta.shared } : definition
    })()
    // Resolution attaches the real handler; this only stops an early rejection from
    // surfacing as an unhandled rejection.
    value.catch(() => {})

    this.entries.set(key, { type: meta.type, name: meta.name, value, origin: 'local' })
    return handle
  }

  private claim(key: string, owner: AnyResource | null, externalName?: string): 'claimed' | 'already' {
    const prev = this.owners.get(key)
    if (prev === undefined) {
      this.owners.set(key, owner)
      return 'claimed'
    }
    // Repeating the same external reference is fine; anything else is a collision.
    if (owner === null && prev === null && this.entries.get(key)?.externalName === externalName) {
      return 'already'
    }
    const split = key.indexOf('.')
    const [type, name] = [key.slice(0, split), key.slice(split + 1)]
    throw new Error(
      `duplicate ${type} "${name}": two different resources claim the same key in one stack. ` +
        `Rename one, or pass the same Resource object to both places.`,
    )
  }

  private readonly use: Use = ((ref: unknown): unknown => {
    if (ref instanceof Context) return this.scope.getContext(ref)
    if (ref instanceof Resource) return this.register(ref)
    throw new TypeError('use(): expected a Context or a Resource')
  }) as Use

  private readonly ref: Ref = ((stack: StackRef, target: AnyResource): { name: string } => {
    if (!(target instanceof Resource)) throw new TypeError('ref(): expected a Resource')
    const meta = Resource.meta(target)
    const where = `ref(${stack?.name}, ${meta.type}.${meta.name})`

    if (!stack || !Array.isArray(stack.items)) throw new TypeError(`${where}: expected a Stack`)
    if (!stack.items.includes(target)) {
      throw new Error(
        `${where}: "${meta.name}" is not declared in stack "${stack.name}". ` +
          `Add it to that stack's items to export it.`,
      )
    }
    // Referencing your own stack is just a local use — no external stub, no dependency edge.
    if (this.self && (stack === this.self || stack.name === this.self.name)) {
      this.register(target)
      return { name: meta.name }
    }
    if (meta.type === 'service') {
      throw new Error(`${where}: services cannot be shared across stacks — reach them over a shared network instead.`)
    }
    if (!meta.shared) {
      throw new Error(
        `${where}: "${meta.name}" does not pin a docker name. Compose prefixes the project name ` +
          `onto ${meta.type} names, so call .shared() on it in stack "${stack.name}".`,
      )
    }

    const key = `${meta.type}.${meta.name}`
    if (this.claim(key, null, meta.shared) === 'claimed') {
      this.entries.set(key, {
        type: meta.type,
        name: meta.name,
        value: Promise.resolve({ external: true, name: meta.shared }),
        origin: 'external',
        externalName: meta.shared,
      })
    }
    this.dependsOn.add(stack.name)
    return { name: meta.name }
  }) as Ref

  /**
   * Drain every registered resource.
   *
   * Bodies may be async and may register further resources after awaiting, so this keeps
   * draining until no new entries appear.
   */
  async resolve(): Promise<Spec> {
    const spec: Record<string, Record<string, unknown>> = {}
    const done = new Set<string>()

    for (;;) {
      const batch = [...this.entries].filter(([key]) => !done.has(key))
      if (batch.length === 0) break
      for (const [key] of batch) done.add(key)

      const settled = await Promise.all(
        batch.map(([, entry]) =>
          entry.value.then(
            (value) => [entry, value] as const,
            (cause: unknown) => {
              const message = cause instanceof Error ? cause.message : String(cause)
              throw new Error(`${entry.type}.${entry.name}: ${message}`, { cause })
            },
          ),
        ),
      )

      for (const [entry, value] of settled) {
        const group = (spec[`${entry.type}s`] ??= {})
        group[entry.name] = value ?? null
      }
    }

    // Emit groups in compose's canonical order so generated files diff cleanly.
    const ordered: Record<string, Record<string, unknown>> = {}
    for (const type of RESOURCE_TYPES) {
      const group = spec[`${type}s`]
      if (group) ordered[`${type}s`] = group
    }
    return ordered as Spec
  }
}

type Group<U, T extends ResourceType> = {
  [
    K in Extract<U, Resource<T, any, any, any>> as K extends Resource<T, infer N extends string, any, any> ? N : never
  ]: K extends Resource<T, any, any, infer S> ? (undefined extends S ? Definitions[T] : S) : never
}

/**
 * The compose file a set of items produces.
 *
 * Only resources passed to `compose()` appear here. Resources pulled in transitively through
 * `use()` are present at runtime but not in the type — declare them if you want them typed.
 */
export type Composed<R extends readonly Item[]> = {
  [T in ResourceType as [Extract<R[number], Resource<T, any, any, any>>] extends [never] ? never : `${T}s`]: Group<
    R[number],
    T
  >
}

/** Build a single compose file. Registration errors surface as a rejection, not a sync throw. */
export const compose = async <R extends readonly Item[]>(...items: R): Promise<Composed<R>> => {
  const registry = new Registry(new Scope())
  registry.registerAll(items)
  return (await registry.resolve()) as Composed<R>
}
