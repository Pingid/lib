import { Schema } from '../../../core/index.ts'

import { extractor, type ExtractorOptions } from './extract.ts'
import { type RouteSpec } from '../types.ts'
import { handlers } from './reply.ts'

// ------------------------------------------------------------------
// Adapter helpers
// ------------------------------------------------------------------
export interface AdapterOptions<R = Request, S = Schema.Type, C = any> extends ExtractorOptions<R, S> {
  context?: C | ((req: R) => C)
}

export const contextFactory = <R extends Request, C = undefined, S extends Schema.Type = Schema.Type>(
  e: AdapterOptions<R, S, C>,
) => {
  const ext = extractor<R, any>(e)
  const ctx = e.context
  const context = ctx ? (typeof ctx === 'function' ? (req: Request) => (ctx as any)(req) : () => ctx) : () => ({}) as C
  return <I extends RouteSpec>(rt: I) => {
    const params = ext(rt)
    return async (req: R) =>
      [{ ...handlers(req), request: req, params: await params(req), spec: rt }, (await context(req)) as C] as const
  }
}
