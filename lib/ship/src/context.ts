import { branded } from './brand.ts'

const CONTEXT: unique symbol = Symbol.for('@pingid/lib-compose:Context')

/** A typed injection key. Values are supplied per `compose()` / `project()` call. */
export class Context<T = any> {
  /** @see {@link branded} */
  readonly [CONTEXT] = true
  static [Symbol.hasInstance] = branded(CONTEXT)

  readonly label: string

  private constructor(label: string) {
    this.label = label
  }

  static define<T>(label = 'anonymous'): Context<T> {
    return new Context<T>(label)
  }

  create(value: T): ContextValue<T> {
    return new ContextValue(this, value)
  }
}

const CONTEXT_VALUE: unique symbol = Symbol.for('@pingid/lib-compose:ContextValue')

export class ContextValue<T = any> {
  /** @see {@link branded} */
  readonly [CONTEXT_VALUE] = true
  static [Symbol.hasInstance] = branded(CONTEXT_VALUE)

  readonly context: Context<T>
  readonly value: T

  constructor(context: Context<T>, value: T) {
    this.context = context
    this.value = value
  }
}
