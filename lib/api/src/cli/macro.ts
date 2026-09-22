import {
  KindGuard,
  OptionalKind,
  Type,
  type Static,
  type TLiteral,
  type TOptional,
  type TSchema,
} from '@sinclair/typebox'

import type { Compute } from './core/util.ts'
import type { Arg } from './arg.ts'
import { Cmd } from './cmd.ts'

export declare namespace Macro {
  /**
   * What `t.str()` and friends return: a TypeBox schema plus the command-line options,
   * with the value type and presence carried phantomly. `_` is required so it can be
   * told apart from a bare schema or a JSON literal — nothing reads it at runtime.
   */
  interface Field<T = unknown, P extends boolean = false> extends Arg.Options<any> {
    type: TSchema
    _: (input: never) => [T, P]
  }

  /** The JSON literal shorthand: `{ type: 'number' }`, `{ type: 'string', enum: [...] }`. */
  type Json = Arg.Options<any> &
    (
      | { readonly type: 'number' | 'integer' | 'boolean' }
      | { readonly type: 'string'; readonly enum?: readonly (string | number)[] }
      | { readonly type: 'array'; readonly items: Value }
    )

  /** Every accepted declaration form. */
  type Value = TSchema | Field<any, any> | Json

  type Args = Record<string, Value>

  /**
   * Present on the input when a schema is not `Type.Optional`, or when a literal form
   * declares `required` or a `default`. A bare `Type.String()` is required, matching
   * how the same schema behaves inside `Type.Object`.
   */
  type Present<V> =
    V extends Field<any, infer P>
      ? P
      : V extends TOptional<TSchema>
        ? false
        : V extends TSchema
          ? true
          : V extends { required: true }
            ? true
            : V extends { default: any }
              ? true
              : false

  /** One declaration to its value type. */
  type Of<V> =
    V extends Field<infer T, boolean>
      ? T
      : V extends TSchema
        ? Exclude<Static<V>, undefined>
        : V extends { type: infer S }
          ? S extends TSchema
            ? Exclude<Static<S>, undefined>
            : OfJson<V>
          : OfJson<V>

  type OfJson<V> = V extends { type: 'number' | 'integer' }
    ? number
    : V extends { type: 'boolean' }
      ? boolean
      : V extends { type: 'string'; enum: infer E }
        ? E extends readonly (infer T)[]
          ? T
          : string
        : V extends { type: 'string' }
          ? string
          : V extends { type: 'array'; items: infer I }
            ? Of<I>[]
            : unknown

  /** A record of declarations to the object a handler receives. */
  type Infer<A extends Args> = Compute<
    { [K in keyof A as Present<A[K]> extends true ? K : never]: Of<A[K]> } & {
      [K in keyof A as Present<A[K]> extends true ? never : K]?: Of<A[K]>
    }
  >

  type Def<N extends string, A extends Args, R> = MethodDef<N, A, R> | GroupDef<N, A, R>

  interface MethodDef<N extends string, A extends Args, R> {
    name: N
    description?: string
    usage?: string
    options: A
    /** Overrides any `positional: true` on the declarations themselves. */
    positionals?: readonly Extract<keyof A, string>[]
    handle: (args: Infer<A>) => R
  }

  interface GroupDef<N extends string, A extends Args, R> {
    name: N
    description?: string
    usage?: string
    options?: A
    commands: Record<string, Cmd.Any>
  }
}

// ---------------- declare --------------------------
const field = (type: TSchema, options?: Arg.Options<any> | string): any => ({
  ...(typeof options === 'string' ? { description: options } : options),
  type,
})

export const str: {
  (description?: string): Macro.Field<string, false>
  <const O extends Arg.Options<string>>(options: O): Macro.Field<string, Macro.Present<O>>
} = (options?: any) => field(Type.String(), options)

export const num: {
  (description?: string): Macro.Field<number, false>
  <const O extends Arg.Options<number>>(options: O): Macro.Field<number, Macro.Present<O>>
} = (options?: any) => field(Type.Number(), options)

export const int: {
  (description?: string): Macro.Field<number, false>
  <const O extends Arg.Options<number>>(options: O): Macro.Field<number, Macro.Present<O>>
} = (options?: any) => field(Type.Integer(), options)

export const bool: {
  (description?: string): Macro.Field<boolean, false>
  <const O extends Arg.Options<boolean>>(options: O): Macro.Field<boolean, Macro.Present<O>>
} = (options?: any) => field(Type.Boolean(), options)

export const of: {
  <const V extends readonly (string | number)[]>(values: V, description?: string): Macro.Field<V[number], false>
  <const V extends readonly (string | number)[], const O extends Arg.Options<V[number]>>(
    values: V,
    options: O,
  ): Macro.Field<V[number], Macro.Present<O>>
  <const V extends readonly (string | number)[], const O extends Arg.Options<V[number]> & { enum: V }>(
    options: O,
  ): Macro.Field<V[number], Macro.Present<O>>
} = (first: any, second?: any) => {
  const inline = Array.isArray(first)
  const values: readonly (string | number)[] = inline ? first : first.enum

  const { enum: _, ...rest } = inline ? (typeof second === 'string' ? { description: second } : (second ?? {})) : first
  const literals = values.map((value) => Type.Literal(value)) as [TLiteral, ...TLiteral[]]

  return field(literals.length === 1 ? literals[0] : Type.Union(literals), rest)
}

export const list: {
  (description?: string): Macro.Field<string[], false>
  <const O extends Arg.Options<string[]>>(options: O): Macro.Field<string[], Macro.Present<O>>
  <I extends Macro.Value>(items: I, description?: string): Macro.Field<Macro.Of<I>[], false>
  <I extends Macro.Value, const O extends Arg.Options<Macro.Of<I>[]>>(
    items: I,
    options: O,
  ): Macro.Field<Macro.Of<I>[], Macro.Present<O>>
} = (first?: any, second?: any) => {
  const declared = isValue(first)
  const items = declared ? toSchema(first) : Type.String()

  return field(Type.Array(items), declared ? second : first)
}

/**
 * Build a command from a record of declarations. The args are assembled into a
 * `Type.Object` and handed to `Cmd.in`, so TypeBox refinements (`minLength`, ranges)
 * are validated, and aliases and descriptions carry through to help.
 */
export const cmd = <const N extends string, const A extends Macro.Args, R>(
  def: Macro.Def<N, A, R>,
): Cmd<Macro.Infer<A>, Awaited<R>, {}, {}> => {
  const properties: Record<string, TSchema> = {}
  const positional: string[] = []
  const sources: Record<string, Arg.Complete> = {}

  for (const [key, value] of Object.entries(def.options ?? {})) {
    const schema = toSchema(value)

    properties[key] = present(value, schema) ? schema : Type.Optional(schema)
    if ((value as Macro.Field).positional) positional.push(key)

    const source = (value as Macro.Field).complete
    if (source !== undefined) sources[key] = source
  }

  const command = Cmd.build(def.name).in(Type.Object(properties))

  if (Object.keys(sources).length > 0) command.complete(sources)

  if (def.description) command.describe(def.description)
  if (def.usage) command.use(def.usage)

  const order = 'positionals' in def ? (def.positionals ?? positional) : positional
  if (order.length > 0) command.positional([...order])

  if ('handle' in def) command.handle(def.handle as (input: any) => R) as any
  if ('commands' in def) command.with(...Object.values(def.commands ?? {})) as any
  return command as Cmd<Macro.Infer<A>, Awaited<R>, {}, {}>
}

export default { cmd, str, num, int, bool, list, enum: of }

// ---------------- H --------------------------
/** Options never carry a `type`, so its presence is what separates a value from options. */
const isValue = (value: unknown): value is Macro.Value =>
  typeof value === 'object' && value !== null && (KindGuard.IsSchema(value) || 'type' in value)

const toSchema = (value: Macro.Value): TSchema => {
  if (KindGuard.IsSchema(value)) return value

  // Loosely typed on purpose: `required` is a boolean here and `string[]` in JSON Schema.
  const { type, required, positional, complete, ...rest } = value as Record<string, any>

  // A wrapped schema keeps its own keywords; the declaration's options ride along, so
  // `alias` and `description` reach `Arg` when `Cmd.in` reads the assembled object.
  if (KindGuard.IsSchema(type)) return { ...type, ...rest } as TSchema

  return fromJson(value as Record<string, any>)
}

/** The literal shorthand to a TypeBox schema, so one path runs the validation. */
const fromJson = (json: Record<string, any>): TSchema => {
  const { type, items, enum: values, required, positional, complete, ...options } = json

  if (values) {
    const literals = (values as unknown[]).map((value) => Type.Literal(value as string))
    if (literals.length === 1) return { ...literals[0]!, ...options }
    return Type.Union(literals as [TLiteral, ...TLiteral[]], options)
  }

  switch (type) {
    case 'number':
      return Type.Number(options)
    case 'integer':
      return Type.Integer(options)
    case 'boolean':
      return Type.Boolean(options)
    case 'array':
      return Type.Array(items ? toSchema(items as Macro.Value) : Type.String(), options)
    default:
      return Type.String(options)
  }
}

const present = (value: Macro.Value, schema: TSchema): boolean => {
  if (KindGuard.IsSchema(value)) return !(OptionalKind in schema)

  const declaration = value as Macro.Field
  return declaration.required === true || declaration.default !== undefined
}
