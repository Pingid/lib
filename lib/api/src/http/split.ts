import { KindGuard, Type, type ObjectOptions, type TObject, type TSchema } from '@sinclair/typebox'

import type { Schema } from '../core/index.ts'
import type { Route } from './route.ts'

export declare namespace Split {
  interface Parts {
    params?: TObject
    query?: TObject
    headers?: TObject
    cookie?: TObject
    body?: TObject
  }
}

/**
 * The flat input schema as one object per source, for adapters that validate ahead of the
 * handler.
 *
 * Property schemas are reused **by reference**, so `OptionalKind`, refinements and transforms
 * ride along and `Type.Object` recomputes `required` from the markers. `Type.Pick` would be the
 * obvious tool and cannot be used: it keys the result by the *input* key, while a framework
 * needs the wire name (`x-request-id`, not `requestId`), and it drops the parent's
 * `additionalProperties` — which is the wrong default in opposite directions for query and body.
 *
 * A standard schema yields nothing. Approximating one as TypeBox would hand the framework a
 * validator that disagrees with the real one, so those routes validate once, in `Schema.validate`.
 */
export const split = (schema: Schema.Type | undefined, bindings: Route.Bindings): Split.Parts => {
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
