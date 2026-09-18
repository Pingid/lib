/** A typed injection key. Values are supplied per `compose()` / `project()` call. */
export class Context<T = any> {
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

export class ContextValue<T = any> {
  readonly context: Context<T>
  readonly value: T

  constructor(context: Context<T>, value: T) {
    this.context = context
    this.value = value
  }
}
