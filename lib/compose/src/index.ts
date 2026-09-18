import type * as D from './types.d.ts'

interface Definitions {
  service: D.DefinitionsService
  network: D.DefinitionsNetwork
  volume: D.DefinitionsVolume
  secret: D.DefinitionsSecret
  config: D.DefinitionsConfig
}

type ResourceType = keyof Definitions

type Ctx<N extends string, O> = {
  name: N
  out: O
  use: <T>(r: Context<T> | Resource<ResourceType, any, T, any>) => T
}
type Init<D, C = any> = (c: C) => D | Promise<D>

type Scope = Map<Context | Resource<ResourceType, string, any, any>, any>

export const compose = (...r: (ContextValue<any> | Resource<ResourceType, any, any, any>)[]) => {
  const scope: Scope = new Map()
  const reg = new Registry()
  r.forEach((spec) => reg.register(spec, scope))
  return reg.resolve()
}

class Registry {
  private resources: Map<ResourceType, Map<string, Promise<any>>> = new Map()

  async resolve() {
    const seen = new Set<any>()

    const output: Record<string, Record<string, any>> = {}

    while (this.resources.size > 0) {
      const b = Array.from(this.resources.entries()).flatMap(([type, m]) =>
        Array.from(m.entries())
          .map(([name, p]) => {
            const key = `${type}.${name}`
            if (seen.has(key)) return null
            seen.add(key)
            return Promise.resolve(p).then((v) => [type, name, v] as const)
          })
          .filter((v) => v !== null),
      )
      this.resources.clear()
      const all = await Promise.all(b)
      for (const [type, name, v] of all) {
        if (!output[`${type}s`]) output[`${type}s`] = {}
        output[`${type}s`]![name] = v
      }
    }

    return output
  }

  register(spec: ContextValue<any> | Resource<ResourceType, string, any, any>, scope: Scope) {
    if (spec instanceof ContextValue) {
      spec.store(scope)
      return
    }

    if (spec instanceof Resource) {
      const use: Ctx<string, any>['use'] = (r) => {
        if (r instanceof Context) {
          if (!scope.has(r)) throw new Error('Context not found')
          return scope.get(r)
        }
        if (r instanceof Resource) {
          this.register(r, scope)
          return scope.get(r)
        }
        throw new Error('Invalid ref')
      }

      const c = { name: spec['_name'], out: spec['_out'], use } as Ctx<string, any>
      scope.set(spec, { ...((spec['_out'] ?? {}) as unknown as Record<string, any>), name: spec['_name'] })

      let m = this.resources.get(spec.type)
      if (!m) this.resources.set(spec.type, (m = new Map()))
      m.set(spec['_name'], Promise.resolve(spec['_spec'](c)))

      return
    }
  }
}

export class Resource<T extends ResourceType, N extends string, O = { name: N }, S = undefined> {
  static service<N extends string>(name: N) {
    return new Resource<'service', N>('service', name)
  }
  static network<N extends string>(name: N) {
    return new Resource<'network', N>('network', name)
  }
  static volume<N extends string>(name: N) {
    return new Resource<'volume', N>('volume', name)
  }
  static secret<N extends string>(name: N) {
    return new Resource<'secret', N>('secret', name)
  }
  static config<N extends string>(name: N) {
    return new Resource<'config', N>('config', name)
  }

  readonly type: T

  protected _name: N
  protected _out: O
  protected _spec = (_: Ctx<N, O>) => null

  constructor(type: T, name: N) {
    this.type = type
    this._name = name
    this._spec = () => ({}) as any
    this._out = {} as O
  }

  spec<const D extends Definitions[T]>(spec: Init<D, Ctx<N, O>>): Resource<T, N, O, D> {
    this._spec = spec as any
    return this as any
  }

  out<const O extends Record<string, any>>(out: O): Resource<T, N, O & { name: N }, S> {
    this._out = out as any
    return this as any
  }
}

export class Context<T = any> {
  static define<T extends Record<string, any> = Record<string, never>>() {
    return new Context<T>()
  }

  private constructor() {}

  create(value: T) {
    return new ContextValue(this, value)
  }
}

class ContextValue<T = any> {
  private value: T
  private ref: Context<T>
  constructor(c: Context<T>, value: T) {
    this.ref = c
    this.value = value
  }
  store(s: Scope) {
    s.set(this.ref, this.value)
  }
}
