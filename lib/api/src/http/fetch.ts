import { Schema } from '../core/index.ts'
import { assemble } from './assemble.ts'
import { HttpError } from './error.ts'
import { fail, ok } from './respond.ts'
import type { Route } from './route.ts'
import type { Compute, Intersect, Struct } from './util.ts'

export declare namespace Fetch {
  /**
   * Context arrives as a second argument, never a closure.
   *
   * Deliberately the shape of `ProxyHandler` in `@pingid/lib-proxy`, for the reason its
   * `ProxyContext` doc gives: a route is built once at startup and applied many times, so
   * anything captured in its closure is frozen for the life of the process. Being
   * shape-compatible also lets a route serve as the fallback of a proxy chain with no adapter
   * in between. A shared convention, not a dependency — nothing here imports proxy.
   *
   * The conditional is what makes a forgotten context a compile error rather than a silent
   * `undefined` reaching the handler.
   */
  type Handler<D extends Struct = {}> = {} extends D
    ? (request: Request, context?: D) => Promise<Response>
    : (request: Request, context: D) => Promise<Response>

  type Ctx<T> = T extends Route<any, any, any, any, infer D> ? D : {}
}

/**
 * Run a route, or report that it does not apply.
 *
 * Shared by `toFetch` and `router` so that "no match" and "matched, then failed" stay distinct:
 * a router has to keep looking in the first case and must not in the second.
 */
const attempt = async (route: Route.Node, request: Request, framework: Struct): Promise<Response | undefined> => {
  if (request.method !== route.method) return undefined

  const matched = route.match(new URL(request.url).pathname)
  if (matched === undefined) return undefined

  try {
    const input = await assemble(route, request, matched)

    const validated = await Schema.validate(input, route.node.in)
    if (!validated.ok) throw HttpError.fromIssues(validated.error)

    const handle = route.node.handle
    if (!handle) throw new HttpError(`Route '${route.node.name}' has no handler`, { status: 501 })

    return ok(await handle(validated.value, await context(route, framework)))
  } catch (error) {
    return fail(error)
  }
}

/** `with` values first, then whatever `from` derives — or the argument itself when there is no `from`. */
const context = async (route: Route.Node, framework: Struct): Promise<Struct> => ({
  ...route.context,
  ...(route.supply ? await route.supply(framework) : framework),
})

/** One route as a standalone handler. Anything it does not match is a 404. */
export const toFetch = <I extends Struct, O, C extends Struct, P extends string, D extends Struct>(
  route: Route<I, O, C, P, D>,
): Fetch.Handler<D> =>
  (async (request: Request, framework: Struct = {}) =>
    (await attempt(route as Route.Node, request, framework)) ?? fail(HttpError.notFound())) as Fetch.Handler<D>

/** Several routes, tried in order. Their context requirements intersect, as `Api.group` does. */
export const router = <const R extends readonly Route.Node[]>(
  ...routes: R
): Fetch.Handler<Compute<Intersect<Fetch.Ctx<R[number]>>>> =>
  (async (request: Request, framework: Struct = {}) => {
    for (const route of routes) {
      const response = await attempt(route, request, framework)
      if (response !== undefined) return response
    }
    return fail(HttpError.notFound())
  }) as Fetch.Handler<Compute<Intersect<Fetch.Ctx<R[number]>>>>
