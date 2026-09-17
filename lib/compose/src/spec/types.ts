import * as D from './compose.ts'
import { FRAG } from './tag.ts'

export interface Frag<T = any, C = void> {
  [FRAG]: true
  build: (c: C) => Promise<T> | T
}

export declare namespace Frag {
  export type Tree<T = any> = T extends null
    ? null
    : T extends undefined
      ? undefined
      : T extends Record<string, any>
        ? FragOr<{ [K in keyof T]: Tree<T[K]> }>
        : T extends Array<infer U>
          ? FragOr<Array<Tree<U> | U>>
          : FragOr<T>

  type FragOr<T> = T | Frag<T, any>

  export type Resolved<T> =
    T extends Frag<infer U>
      ? Resolved<U>
      : T extends Record<string, any>
        ? { [K in keyof T]: Resolved<T[K]> }
        : T extends Array<infer U>
          ? Array<Resolved<U>>
          : T extends ReadonlyArray<infer U>
            ? ReadonlyArray<Resolved<U>>
            : T

  type ContextOf<T> =
    T extends Frag<infer U, infer C>
      ? C extends void
        ? ContextOf<U>
        : C | ContextOf<U>
      : T extends Array<infer U>
        ? ContextOf<U>
        : T extends ReadonlyArray<infer U>
          ? ContextOf<U>
          : T extends Record<string, any>
            ? { [K in keyof T]: ContextOf<T[K]> }[keyof T]
            : never
}

export interface Compose {
  services?: Record<string, Frag.Tree<D.DefinitionsService>>
  networks?: Record<string, Frag.Tree<D.DefinitionsNetwork>>
  volumes?: Record<string, Frag.Tree<D.DefinitionsVolume>>
  secrets?: Record<string, Frag.Tree<D.DefinitionsSecret>>
  configs?: Record<string, Frag.Tree<D.DefinitionsConfig>>
}

export declare namespace Compose {
  export type Part<K extends Kind = Kind, N extends string = string, T = any> = { $name: N; kind: K } & {
    [key in N]: T
  }

  type Parts = {
    service: D.DefinitionsService
    network: D.DefinitionsNetwork
    volume: D.DefinitionsVolume
    secret: D.DefinitionsSecret
    config: D.DefinitionsConfig
  }

  export type Kind = keyof Parts

  export type Composed<M extends ReadonlyArray<Part<any, any, any>>> = Compute<{
    [K in M[number]['kind']]: Compute<Combined<Extract<M[number], { kind: K }>, K>>
  }>

  export type ComposedWithContext<C, M extends Part<any, any, C>[]> = {
    [K in M[number]['kind']]: Compute<Combined<Extract<M[number], { kind: K }>, K>>
  }

  type Combined<M extends Compose.Part<K, string, any>, K extends keyof Compose.Parts> = {
    [K in M['$name']]: Extract<M, { $name: K }>[K]
  }

  export type ContextOf<T> = Cx<Frag.ContextOf<T>>

  type Cx<T> = [T] extends [never] ? void : Compute<Intersect<T>>
}

// ---------------- Factories --------------------------
export interface ContextFactory<C> {
  compose: <const M extends ReadonlyArray<Compose.Part<any, any, C>>>(cms: M) => Compose.Composed<M>
  service: Factory.ContextFn<'service', C>
  network: Factory.ContextFn<'network', C>
  volume: Factory.ContextFn<'volume', C>
  secret: Factory.ContextFn<'secret', C>
  config: Factory.ContextFn<'config', C>
}

export declare namespace Factory {
  type Fn<K extends Compose.Kind> = <const N extends string, const M extends Frag.Tree<Compose.Parts[K]>, C = void>(
    name: N,
    m: ((c: C, name: N) => M | Promise<M>) | M,
  ) => Compose.Part<K, N, Frag<Frag.Resolved<M>, C>>

  type ContextFn<K extends Compose.Kind, Cx extends any> = <
    const N extends string,
    const M extends Frag.Tree<Compose.Parts[K]>,
    C extends Cx,
  >(
    name: N,
    m: ((c: C, name: N) => M | Promise<M>) | M,
  ) => Compose.Part<K, N, Frag<Frag.Resolved<M>, C>>
}

// ---------------- Utils --------------------------
type Intersect<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never
type Compute<T> = { [K in keyof T]: T[K] } & {}
