import { isSecure, url, type Route, type Upstream } from './route.js'
import { proxy, ProxyError, type ForwardOptions } from './forward.js'
import { match, type Params } from './match.js'

/**
 * Where a mount's traffic goes. Returning nothing declines the match, so a
 * resolver doubles as a guard: an unknown name simply falls through to the
 * next mount, and then to {@link ProxyOptions.notFound}.
 */
export type Resolver = (
  params: Params,
  request: Request,
) => Upstream | null | undefined | Promise<Upstream | null | undefined>

export type Mount = {
  /** Path pattern of literal and `:named` segments, e.g. `/proxy/:name`. */
  pattern: string
  upstream: Upstream | Resolver
}

export type ProxyOptions = ForwardOptions & {
  mounts: readonly Mount[]
  /** Served when no mount claims the request. Defaults to a bare 404. */
  notFound?: (request: Request) => Response | Promise<Response>
}

/**
 * The whole library in one handler: match, resolve, forward.
 *
 * Nothing here is privileged — it is `match` and `forward` in a loop — so reach
 * past it the moment your dispatch needs something this does not do.
 *
 * ```ts
 * Bun.serve({ fetch: createProxy({ mounts: [{ pattern: "/proxy/:name", upstream: lookup }] }) });
 * ```
 */
export const createProxy = ({ mounts, notFound, ...options }: ProxyOptions) => {
  const resolvers = mounts.map(({ pattern, upstream }) => ({
    pattern,
    resolve: typeof upstream === 'function' ? upstream : () => upstream,
  }))

  return async (request: Request): Promise<Response> => {
    const from = new URL(request.url)
    const secure = isSecure(request)

    for (const { pattern, resolve } of resolvers) {
      const hit = match(pattern, from.pathname)
      if (!hit) continue

      const upstream = await resolve(hit.params, request)
      if (upstream == null) continue

      const route: Route = { prefix: hit.prefix, upstream: url(upstream), secure }
      try {
        return await proxy(request, route, options)
      } catch (error) {
        if (error instanceof ProxyError) return error.response
        throw error
      }
    }

    return notFound?.(request) ?? new Response('Not Found', { status: 404 })
  }
}

// export const proxy = (req: Request, ) => {
