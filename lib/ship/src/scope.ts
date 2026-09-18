import type { Context } from './context.ts'
import type { AnyResource } from './resource.ts'

/**
 * Resolution scope.
 *
 * Context values resolve up the parent chain, so a project can supply configuration to every
 * stack. Resource handles are local only, so the same `Resource` used in two stacks is built
 * once per stack rather than shared between them.
 */
export class Scope {
  private readonly parent: Scope | undefined
  private readonly contexts = new Map<Context<any>, unknown>()
  private readonly handles = new Map<AnyResource, unknown>()

  constructor(parent?: Scope) {
    this.parent = parent
  }

  child(): Scope {
    return new Scope(this)
  }

  setContext<T>(context: Context<T>, value: T): void {
    this.contexts.set(context, value)
  }

  getContext<T>(context: Context<T>): T {
    for (let s: Scope | undefined = this; s; s = s.parent) {
      if (s.contexts.has(context)) return s.contexts.get(context) as T
    }
    throw new Error(`context "${context.label}" was not provided to this scope`)
  }

  hasHandle(r: AnyResource): boolean {
    return this.handles.has(r)
  }

  getHandle(r: AnyResource): unknown {
    return this.handles.get(r)
  }

  setHandle(r: AnyResource, handle: unknown): void {
    this.handles.set(r, handle)
  }
}
