import type { Env, Handler, TypedResponse } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { Schema } from '../core/index.ts'
import { HttpError } from './error.ts'
import * as Input from './input.ts'
import type * as Route from './route.ts'
import type { Struct } from './util.ts'

/** Hono's names for the same four sources. `json` is its key for a validated body. */
export type Parts<I, S> = Route.Present<{
  param: Route.Part<I, S, 'path'>
  query: Route.Part<I, S, 'query'>
  header: Route.Part<I, S, 'header'>
  json: Route.Part<I, S, 'body'>
}>

/**
 * What `hc` reads to type a request. Asserted rather than produced by validator middleware,
 * and backed by `Schema.validate` — the same claim `hono/validator` makes, against our own
 * validation instead of someone else's.
 */
export type In<I, S> = { in: Parts<I, S>; out: Parts<I, S> }

/**
 * One route as a single Hono handler.
 *
 * Deliberately not a spread of `[validator, validator, handler]`: `.get` is an overload ladder
 * ending in a variadic rung, and falling through to it still compiles and still serves while
 * `hc` silently loses its typed request arguments. One handler keeps that inference in one
 * stable position. No validator package either — each covers only half of `Schema.Type`, and
 * skipping `Schema.validate`'s `Convert → Check → Decode` would change what the handler gets.
 *
 * @example
 * ```ts
 * import { Hono as HonoApp } from 'hono'
 * import * as Hono from '@pingid/lib-api/http/hono'
 *
 * const app = new HonoApp().get('/orgs/:org', Hono.route(get))
 * hc<typeof app>('/').orgs[':org'].$get({ param: { org: 'a' }, query: { page: 2 } })
 * ```
 */
export const route = <I extends Struct, O, C extends Struct, P extends string, D extends Struct, S>(
  route: Route.Type<I, O, C, P, D, S>,
): Handler<Env, P, In<I, S>, Promise<TypedResponse<O, 200, 'json'>>> => {
  const node = route as unknown as Route.Node

  return (async (c: Struct) => {
    const request = (c['req'] as { raw: Request }).raw

    try {
      const input = await Input.assemble(node, request)

      const validated = await Schema.validate(input, node.node.in)
      if (!validated.ok) throw HttpError.fromIssues(validated.error)

      const handle = node.node.handle
      if (!handle) throw new HttpError(`Route '${node.node.name}' has no handler`, { status: 501 })

      const context = { ...node.context, ...(node.supply ? await node.supply(c) : c) }
      return (c['json'] as (value: unknown) => Response)(await handle(validated.value, context))
    } catch (error) {
      if (!(error instanceof HttpError)) throw error

      // An `HTTPException` carrying a response keeps `app.onError` and `app.notFound` in charge.
      throw new HTTPException(error.status as 422, {
        res: Response.json(error.body as never, { status: error.status }),
      })
    }
  }) as unknown as Handler<Env, P, In<I, S>, Promise<TypedResponse<O, 200, 'json'>>>
}
