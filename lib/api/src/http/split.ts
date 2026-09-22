/**
 * Splitting one flat input schema into the per-source objects a framework validates.
 *
 * @module
 */
import { KindGuard, Type, type ObjectOptions, type TObject, type TSchema } from '@sinclair/typebox'

import type { Schema } from '../core/index.ts'
import type * as Route from './route.ts'

export interface Parts {
  params?: TObject
  query?: TObject
  headers?: TObject
  cookie?: TObject
  body?: TObject
}

/**
 * The flat input schema as one object per source, for adapters that validate ahead of the
 * handler. Property schemas are reused by reference, so refinements and `OptionalKind` ride
 * along. `Type.Pick` cannot do this: it keys by the *input* key where a framework needs the
 * wire name, and drops the parent's `additionalProperties`.
 *
 * A standard schema yields nothing — approximating one as TypeBox would give the framework a
 * validator that disagrees with the real one, so those routes validate once in `Schema.validate`.
 *
 * @example
 * ```ts
 * of(schema, route.bindings) // { params: TObject, query: TObject, headers: TObject }
 * ```
 */
export const of = (schema: Schema.Type | undefined, bindings: Route.Bindings): Parts => {
  if (schema === undefined || !KindGuard.IsObject(schema)) return {}
  if (KindGuard.IsTransform(schema)) throw new Error('A transformed input schema cannot be split per source')

  const names = (source: Route.Source): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const [key, binding] of Object.entries(bindings)) if (binding.source === source) out[key] = binding.name
    return out
  }

  // Extra query parameters, headers and cookies are ordinary traffic and must not fail a request.
  const loose: ObjectOptions = { additionalProperties: true }

  return {
    params: pick(schema, names('path')),
    query: pick(schema, names('query'), loose),
    headers: pick(schema, names('header'), loose),
    cookie: pick(schema, names('cookie'), loose),
    body: pick(schema, names('body')),
  }
}

const pick = (schema: TObject, names: Record<string, string>, options?: ObjectOptions): TObject | undefined => {
  const keys = Object.keys(names)
  if (keys.length === 0) return undefined

  const properties: Record<string, TSchema> = {}
  for (const key of keys) {
    const property = schema.properties[key]
    if (property !== undefined) properties[names[key]!] = property
  }

  return Type.Object(properties, options)
}
