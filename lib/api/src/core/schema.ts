import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec'
import type * as Typebox from '@sinclair/typebox/type'
import { Value } from '@sinclair/typebox/value'
import { KindGuard } from '@sinclair/typebox'

export type Type<Output = unknown, Input = Output> = Standard<Input, Output> | TSchema

export type Output<T> =
  T extends Standard<any, infer Output> ? Output : T extends Typebox.TSchema ? Typebox.Static<T> : never

export declare namespace Type {
  export type Object<T extends Record<string, Type> = Record<string, any>> =
    Standard<T, T> | Typebox.TObject<T extends Record<string, Typebox.TSchema> ? T : never>

  export type String = Standard<string, any> | Typebox.TString
}
/**
 * TypeBox's schema type, which does not carry its static type — so a `Schema<Output>`
 * built from one keeps `Output` while losing the concrete `TObject<{ ... }>`.
 *
 * That erasure is deliberate here (the union has to admit both schema dialects), but it
 * is invisible at the use site, so it is worth naming: an adapter that needs the schema
 * type back has to re-assert it from the static type, which is what `TypedSchema<O>` in
 * `http/schema.ts` does.
 */
type TSchema = Typebox.TSchema

/** JSON Schema for a schema's `input` (what is sent) or `output` (what validation yields). */
export const toJson = (schema: Type, io: 'input' | 'output' = 'input', target = 'draft-07'): Json => {
  if (!isStandard(schema)) return schema as Json
  return schema['~standard'].jsonSchema[io]({ target }) as Json
}

/** True for a Standard JSON schema or a TypeBox schema. */
export const is = (value: unknown): value is Type => isStandard(value) || KindGuard.IsSchema(value)

/** Coerce string input toward a TypeBox schema, e.g. `'5'` for an integer. Other schemas get the value unchanged. */
export const convert = (schema: Type, value: unknown): unknown =>
  KindGuard.IsSchema(schema) ? Value.Convert(schema, value) : value

export const validate = async <T = unknown>(input: T, schema?: Type): Promise<Result<T, Issue[]>> => {
  if (schema === undefined) return Result.ok(input)

  const validate = props(schema)?.validate
  if (typeof validate === 'function') {
    const result = await (validate as (value: unknown) => any)(input)
    if (!result.issues) return Result.ok(result.value as T)
    return Result.err(result.issues.map(standardIssue))
  }

  if (KindGuard.IsSchema(schema)) {
    const value = convert(schema, input)
    if (!Value.Check(schema, value)) return Result.err([...Value.Errors(schema, value)].map(typeboxIssue))
    return Result.ok(Value.Decode(schema as TSchema, value) as T)
  }

  return Result.ok(input)
}

/** The JSON Schema keywords these helpers read. The rest of a document is ignored. */
export interface Json {
  [key: string]: unknown
  type?: string | string[]
  description?: string
  default?: unknown
  enum?: unknown[]
  items?: Json
  properties?: Record<string, Json>
  required?: string[]
  oneOf?: Json[]
  anyOf?: Json[]
}

export interface Issue {
  path: string
  message: string
}

export interface Standard<I = unknown, O = I> extends StandardJSONSchemaV1<I, O> {
  readonly '~standard': StandardJSONSchemaV1.Props<I, O> & Partial<StandardSchemaV1.Props<I, O>>
}

const standardIssue = (issue: { message: string; path?: readonly unknown[] }): Issue => ({
  path: (issue.path ?? [])
    .map((part) => (typeof part === 'object' && part !== null ? (part as { key: PropertyKey }).key : part))
    .join('.'),
  message: issue.message,
})

const typeboxIssue = (error: { message: string; path: string }): Issue => ({
  path: error.path.split('/').filter(Boolean).join('.'),
  message: error.message,
})

const isStandard = <Input = any, Output = Input>(schema: unknown): schema is StandardJSONSchemaV1<Input, Output> => {
  return (
    (typeof schema === 'object' || typeof schema === 'function') &&
    schema !== null &&
    '~standard' in schema &&
    typeof schema['~standard'] === 'object' &&
    schema['~standard'] !== null &&
    'jsonSchema' in schema['~standard']
  )
}

const props = (schema: Type | undefined): { validate?: unknown } | undefined =>
  (schema as { '~standard'?: { validate?: unknown } } | undefined)?.['~standard']

export type Result<T, E = unknown> = Result.Ok<T> | Result.Err<E>

export declare namespace Result {
  export type Ok<T> = { ok: true; value: T }
  export type Err<E> = { ok: false; error: E }
}

export const Result = {
  ok: <T>(value: T): Result.Ok<T> => ({ ok: true, value }),
  err: <E>(error: E): Result.Err<E> => ({ ok: false, error }),
}
