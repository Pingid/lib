import { Schema } from '../core/index.ts'
import { HttpError } from './error.ts'
import * as Input from './input.ts'
import * as Respond from './respond.ts'
import type * as Route from './route.ts'
import type { Compute, Intersect, Struct } from './util.ts'

/**
 * Context arrives as a second argument, never a closure — the shape `ProxyHandler` in
 * `@pingid/lib-proxy` uses, for the reason its `ProxyContext` doc gives: a route is built once
 * and applied many times, so anything in its closure is frozen for the life of the process. A
 * shared convention, not a dependency. The conditional makes a forgotten context a compile
 * error rather than a silent `undefined`.
 *
 * @example
 * ```ts
 * const handler = Fetch.handler(get)
 * await handler(new Request('http://localhost/orgs/acme'), { db })
 * ```
 */
export type Handler<D extends Struct = {}> = {} extends D
  ? (request: Request, context?: D) => Promise<Response>
  : (request: Request, context: D) => Promise<Response>

export type Ctx<T> = T extends Route.Type<any, any, any, any, infer D> ? D : {}

/**
 * Run a route, or report that it does not apply. Shared so "no match" and "matched, then
 * failed" stay distinct: a router keeps looking in the first case and must not in the second.
 */
const attempt = async (route: Route.Node, request: Request, framework: Struct): Promise<Response | undefined> => {
  if (request.method !== route.method) return undefined

  const matched = route.match(new URL(request.url).pathname)
  if (matched === undefined) return undefined

  try {
    const input = await Input.assemble(route, request, matched)

    const validated = await Schema.validate(input, route.node.in)
    if (!validated.ok) throw HttpError.fromIssues(validated.error)

    const handle = route.node.handle
    if (!handle) throw new HttpError(`Route '${route.node.name}' has no handler`, { status: 501 })

    return Respond.ok(await handle(validated.value, await context(route, framework)))
  } catch (error) {
    return Respond.fail(error)
  }
}

/** `with` values first, then whatever `from` derives — or the argument itself when there is no `from`. */
const context = async (route: Route.Node, framework: Struct): Promise<Struct> => ({
  ...route.context,
  ...(route.supply ? await route.supply(framework) : framework),
})

/** One route as a standalone handler. Anything it does not match is a 404. */
export const handler = <I extends Struct, O, C extends Struct, P extends string, D extends Struct>(
  route: Route.Type<I, O, C, P, D>,
): Handler<D> =>
  (async (request: Request, framework: Struct = {}) =>
    (await attempt(route as Route.Node, request, framework)) ?? Respond.fail(HttpError.notFound())) as Handler<D>

/**
 * Several routes, tried in order. Their context requirements intersect, as `Api.group` does.
 *
 * @example
 * ```ts
 * const handler = Fetch.router(get, create) // (request, { db }) => Promise<Response>
 * ```
 */
export const router = <const R extends readonly Route.Node[]>(
  ...routes: R
): Handler<Compute<Intersect<Ctx<R[number]>>>> =>
  (async (request: Request, framework: Struct = {}) => {
    for (const route of routes) {
      const response = await attempt(route, request, framework)
      if (response !== undefined) return response
    }
    return Respond.fail(HttpError.notFound())
  }) as Handler<Compute<Intersect<Ctx<R[number]>>>>
