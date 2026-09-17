import type { Compose, Factory, Frag, ContextFactory } from './types.ts'
import { FRAG } from './tag.ts'

export const frag = <T, C = void>(build: ((c: C) => Promise<T> | T) | T): Frag<T, C> => ({
  [FRAG]: true,
  build: (c: any) => Promise.resolve(typeof build === 'function' ? (build as any)(c) : build),
})

export const compose = <const M extends ReadonlyArray<Compose.Part<any, any, any>>>(cms: M): Compose.Composed<M> => {
  const all: Record<any, any> = {}
  for (const m of cms) {
    const key = `${m.kind}s`
    all[key] = { ...all[key], [m.$name]: m[m.$name] }
  }
  return all as any
}

export const spec =
  <const M extends Compose>(m: () => M): ((c: Compose.ContextOf<M>) => Frag.Resolved<M>) =>
  (c) =>
    resolve<any>(m(), c as any) as any

export const service: Factory.Fn<'service'> = (n, m) => factory('service')(n, m)
export const network: Factory.Fn<'network'> = (n, m) => factory('network')(n, m)
export const volume: Factory.Fn<'volume'> = (n, m) => factory('volume')(n, m)
export const secret: Factory.Fn<'secret'> = (n, m) => factory('secret')(n, m)
export const config: Factory.Fn<'config'> = (n, m) => factory('config')(n, m)

export const ctx = <C = void>(): ContextFactory<C> => ({ compose, service, network, volume, secret, config })

export const resolve = <T>(
  m: Frag<T> | T,
  ...c: Compose.ContextOf<T> extends void ? [] : [Compose.ContextOf<T>]
): Promise<T> => walk(m, async (f) => f.build(...(c as [any])))

// ---------------- Internal --------------------------
const factory =
  <K extends Compose.Kind>(kind: K): Factory.Fn<K> =>
  ($name, m) =>
    ({
      $name,
      kind,
      [$name]: frag((c: any) => (typeof m === 'function' ? (m as any)(c, $name) : (m as any))) as any,
    }) as any

const walk = async (m: unknown, cb: (k: Frag<any, any>) => Promise<any>): Promise<any> => {
  if (isFrag(m)) return walk(await cb(m), cb)
  if (Array.isArray(m)) return Promise.all(m.map((v: any) => walk(v, cb)))

  if (typeof m === 'object' && m !== null) {
    const rec: Record<string, any> = {}
    for (const [k, v] of Object.entries(m)) {
      const r = await walk(v, cb)

      rec[k] = r
    }
    return rec
  }

  return m
}

const isFrag = (m: unknown): m is Frag<any> => !!m && typeof m === 'object' && FRAG in m
