import type { Schema } from '../../core/index.ts'
import { readBody, validate, type BodyReaders } from '../route/context/extract.ts'
import * as Route from '../route/index.ts'

/** A route with a path, as frameworks need one to mount it. */
export type Spec = Route.RouteSpec & { path: string }

export interface Routable<I extends Route.RouteSpec, C> {
  schema: I
  handler: Route.RouteHandler<I, C>
}

/** Any mountable route. Structural, since `Routable` is contravariant in its spec through `handler`. */
export type AnyRoutable = { schema: Spec; handler: (ctx: any, context: any) => unknown }

/** Request parts as the host framework parsed them. Thunks, so a part the route does not declare is never read. */
export interface Parts<F> {
  params: () => unknown
  query: () => unknown
  body: BodyReaders
  framework: F
}

/**
 * Run a route against framework-parsed parts instead of re-reading the `Request`.
 *
 * Parts are keyed by request in a `WeakMap`, so the core still receives the framework's own `Request`
 * untouched.
 */
export const serve = <F, C>(rt: Routable<any, C>, context: (framework: F) => C) => {
  const parts = new WeakMap<Request, Parts<F>>()
  const read = (k: 'params' | 'query') => async (req: Request, schema?: Schema.Type) => {
    const p = parts.get(req)!
    return schema ? validate(schema, await p[k]()) : p[k]()
  }
  const run = Route.adapter<Request, C, any>({
    path: read('params'),
    query: read('query'),
    body: (req, spec) => readBody(spec, req, parts.get(req)!.body),
    context: (req) => context(parts.get(req)!.framework),
  })(rt.schema)
  return (req: Request, p: Parts<F>) => (parts.set(req, p), run(req))
}

// ------------------------------------------------------------------
// Types shared by the framework adapters
// ------------------------------------------------------------------
export type Intersect<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

export type Method<I extends Route.RouteSpec> = I['method'] extends string ? I['method'] : 'GET'

/** The request parts a route declares a schema for, as validated values. */
export type Inputs<I extends Route.RouteSpec> = Route.Compute<
  (I['params'] extends Schema.Type ? { params: Schema.Output<I['params']> } : {}) &
    (I['query'] extends Schema.Type ? { query: Schema.Output<I['query']> } : {}) &
    (Route.JsonBody<I['body']> extends Schema.Type ? { body: Schema.Output<Route.JsonBody<I['body']>> } : {})
>

/**
 * One entry per declared status and content type, with `data` as a client decodes it: JSON by its schema,
 * octet-stream as an `ArrayBuffer`, everything else as text.
 */
export type Responses<I extends Route.RouteSpec, N = Route.NormalizedRouteResponseSchema<I['response']>> = {
  [S in keyof N]: {
    [T in keyof N[S]]: T extends 'application/json'
      ? { status: S; format: 'json'; data: Schema.Output<N[S][T]> }
      : T extends 'application/octet-stream'
        ? { status: S; format: 'binary'; data: ArrayBuffer }
        : { status: S; format: 'text'; data: string }
  }[keyof N[S]]
}[keyof N]
