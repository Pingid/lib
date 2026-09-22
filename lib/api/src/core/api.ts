import type { Static, TObject, TUnknown, TSchema } from '@sinclair/typebox/type'
import * as Schema from './schema.ts'

export interface Meta {
  [x: string]: unknown
  name: string
  description?: string
}

/** Symbol key applied to types */
export const Tag: unique symbol = Symbol.for('@pingig/lib/api/core/Tag')

export type Type<C extends Struct = any> = Group<C> | Method<any, any, C>

export interface Group<in C extends Struct = {}> extends Meta {
  [Tag]: 'group'
  methods: (Method.Any | Group<C>)[]
}

export interface Method<
  in out I extends Struct = {},
  out O extends any = undefined,
  in C extends Struct = {},
> extends Method.Fields<I, O> {
  [Tag]: 'method'
  in: Schema.Type<I>
  out: Schema.Type<O>
  /** `O` is the resolved type — an async handler is the normal case over HTTP. */
  handle: (input: I, context: C) => O | Promise<O>
}

export const isGroup = <T extends Type>(node: T): node is T & Group => node[Tag] === 'group'
export const group = <const O extends (Method.Any | Group<any>)[]>(
  spec: Meta & { methods: O },
): Group<Group.GroupContexts<O[number]>> => ({ ...spec, [Tag]: 'group' }) as any

export declare namespace Group {
  export type GroupContexts<T> = Compute<
    Intersect<T extends Method<any, any, infer C> ? C : T extends Group<infer C> ? C : {}>
  >
}

export const method: {
  // ---------------- Typebox schema --------------------------
  <I extends TObject, O extends TSchema, C extends Struct = {}>(
    spec: Meta & { in: I; out?: O; handle: (input: Static<I>, context: C) => Static<O> | Promise<Static<O>> },
  ): Method<Static<I>, Static<O>, C>

  <I extends TObject, O extends TSchema = TUnknown, C extends Struct = {}>(
    handle: (input: Static<I>, context: C) => Static<O> | Promise<Static<O>>,
    spec: Meta & { in: I; out?: O },
  ): Method<Static<I>, Static<O>, C>

  // ---------------- Standard schema --------------------------
  <I extends Schema.Type, O extends Schema.Type, C extends Struct = {}>(
    spec: Meta & {
      in: I
      out?: O
      handle: (
        input: Schema.Output<I>,
        context: C,
      ) => Schema.Output<O> | Promise<Schema.Output<O>> | AsyncIterable<Schema.Output<O>>
    },
  ): Method<
    Schema.Output<I> extends Struct ? Schema.Output<I> : never,
    Schema.Output<O> extends Struct ? Schema.Output<O> : never,
    C
  >
} = (handle: any, spec?: any) => {
  return typeof handle === 'function' ? { ...spec, handle } : handle
}

export declare namespace Method {
  export type Any = Method<any, any, any>
  interface Fields<I extends Struct = {}, O extends any = undefined> extends Meta {
    in?: Schema.Type<I>
    out?: Schema.Type<O>
  }
}

// ---------------- H --------------------------
export type Struct = Record<string, any>
type Intersect<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never
type Compute<T> = { [K in keyof T]: T[K] } & {}
