/// <reference path="./ambient.d.ts" />

import type { VirtualModule } from '../types.d.ts'
import { mods } from 'virtual:@pingid/lib/vite/manifest'

import type { Callback, Dispose, Register } from './runtime.ts'

/** `string` until the generated declaration augments `VirtualModule`. */
export type Key = keyof VirtualModule extends never ? string : keyof VirtualModule
type Mod<K> = K extends keyof VirtualModule ? VirtualModule[K] : Record<string, any>

export const run: <K extends Key>(key: K, cb: Callback<Mod<K>>) => VirtualMod<Mod<K>> = (
  key: string,
  cb: Callback<any>,
): any => {
  const entry = mods[key]
  if (!entry) throw new Error(`[@pingid/lib/vite] no virtual module registered for "${key}"`)
  return new VirtualMod(key, entry.load, cb)
}

export type Resolved<T> = T

export class VirtualMod<T> {
  private def = defer<Resolved<T>>()
  private stop: Dispose = () => {}
  private disposed = false
  public resolved: Resolved<T> | null = null

  private key: string
  private cb: Callback<T>
  constructor(key: string, load: () => Promise<{ register: Register<T> }>, cb: Callback<T>) {
    this.key = key
    this.cb = cb
    const resolve = (mod: Resolved<T>) => {
      this.resolved = mod
      this.def.resolve(this.resolved)
      return this.cb(mod)
    }

    load().then(
      (m) => {
        if (this.disposed) return
        this.stop = m.register((mod) => resolve(mod))
      },
      (e) => this.def.reject(e instanceof Error ? e : new Error(String(e))),
    )
  }

  then<R = Resolved<T>>(
    onfulfilled: (value: Resolved<T>) => R = (x) => x as unknown as R,
    onrejected: (reason: any) => void = console.error,
  ) {
    return this.def.promise.then(onfulfilled, onrejected)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.stop = () => {}
    if (this.resolved) return
    this.def.reject(new Error(`[@pingid/lib/vite] "${this.key}" disposed before it loaded`))
    this.def.promise.catch(() => {}) // nobody may be awaiting wait()
  }

  [Symbol.dispose]() {
    this.dispose()
  }

  async [Symbol.asyncDispose]() {
    if (this.disposed) return
    await this.def.promise.catch(() => {})
    this.dispose()
  }
}

export const defer = <T>() => {
  let res!: (value: T) => void
  let rej!: (error: Error) => void
  const promise = new Promise<T>((resolve, reject) => ((res = resolve), (rej = reject)))
  return { promise, resolve: (v: T) => res(v), reject: (e: Error) => rej(e) }
}
