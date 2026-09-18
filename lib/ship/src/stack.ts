import type { Definitions, Item, Resource, ResourceType, StackRef } from './resource.ts'
import type { ComposeSpecification } from './types.js'
import { Registry } from './registry.ts'
import { Scope } from './scope.ts'
import { branded } from './brand.ts'

/** A compose file. `name` is the project name, which the generated types predate. */
export type Spec = ComposeSpecification & { name?: string }

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

export interface StackOptions {
  /** Docker project name. Defaults to the stack name. */
  project?: string
}

const STACK: unique symbol = Symbol.for('@pingid/lib-compose:Stack')

/** A named group of resources that becomes one compose file / one docker project. */
export class Stack<I extends readonly Item[] = readonly Item[]> implements StackRef {
  /** @see {@link branded} */
  readonly [STACK] = true
  static [Symbol.hasInstance] = branded(STACK)

  readonly name: string
  readonly items: I
  readonly options: StackOptions

  static create<I extends readonly Item[]>(name: string, items: I, options: StackOptions = {}): Stack<I> {
    return new Stack<I>(name, items, options)
  }

  constructor(name: string, items: I, options: StackOptions = {}) {
    this.name = name
    this.items = items
    this.options = options
  }

  get project(): string {
    return this.options.project ?? this.name
  }

  compose(): Promise<Composed<I>> {
    return Stack.compose(...this.items) as any
  }

  /** Build a single compose file. Registration errors surface as a rejection, not a sync throw. */
  static async compose<R extends readonly Item[]>(...items: R): Promise<Composed<R>> {
    const registry = new Registry(new Scope())
    registry.registerAll(items)
    return (await registry.resolve()) as Composed<R>
  }
}

type Group<U, T extends ResourceType> = {
  [
    K in Extract<U, Resource<T, any, any, any>> as K extends Resource<T, infer N extends string, any, any> ? N : never
  ]: K extends Resource<T, any, any, infer S> ? (undefined extends S ? Definitions[T] : S) : never
}
