// ------------------------------------------------------------------
// Providers
//
// A dependency is a plain function of the request. Routes list the providers they need under
// `inject`, so a request only builds what its route asks for. Within one request each provider runs
// at most once, however many routes, providers or middleware ask for it.
// ------------------------------------------------------------------
type P<T> = T | Promise<T>

/** Resolve a provider within the current request's scope. */
export type Get = <T>(provider: Provider<T>) => Promise<T>

/**
 * A dependency built per request. Call `get` for other providers; throw a `Response` to stop the request.
 *
 * @example
 * const user: Provider<User> = async (req, get) => {
 *   const s = await get(session)
 *   if (!s) throw new Response('Unauthorized', { status: 401 })
 *   return db.user(s.uid)
 * }
 */
export type Provider<T = unknown> = (req: Request, get: Get) => P<T>

export type Injects = { [key: string]: Provider<any> }

/** The values a route's `inject` resolves to. */
export type Injected<D> = { [K in keyof D]: D[K] extends Provider<any> ? Awaited<ReturnType<D[K]>> : never }

/** A provider swapped for another, e.g. a fake in tests. */
export type Override = readonly [Provider<any>, Provider<any>]
export const override = <T>(provider: Provider<T>, by: Provider<NoInfer<T>>): Override => [provider, by]

const scopes = new WeakMap<Request, Get>()

/** Start a fresh scope for a request. Routers call this; call it yourself only to apply overrides. */
export const open = (req: Request, overrides?: ReadonlyMap<Provider<any>, Provider<any>>): Get => {
  const cache = new Map<Provider<any>, Promise<any>>()
  const get: Get = (p) => {
    let v = cache.get(p)
    if (!v) {
      const impl = overrides?.get(p) ?? p
      // async so a synchronous throw becomes a rejection like any other
      cache.set(p, (v = (async () => impl(req, get))()))
    }
    return v
  }
  scopes.set(req, get)
  return get
}

/** The request's scope, opened on first use. */
export const scope = (req: Request): Get => scopes.get(req) ?? open(req)

/** Resolve a provider for a request, e.g. from middleware. Shares the route's cache. */
export const inject = <T>(req: Request, provider: Provider<T>): Promise<T> => scope(req)(provider)

/** A provider built once for the process rather than per request. A failed build is retried. */
export const once = <T>(build: () => P<T>): Provider<T> => {
  let v: Promise<T> | undefined
  return () =>
    (v ??= (async () => build())().catch((e) => {
      v = undefined
      throw e
    }))
}

/** Resolve `inject` in parallel into an object keyed like it. */
export const resolver = (inject: Injects) => {
  const keys = Object.keys(inject)
  const providers = Object.values(inject)
  return async (req: Request): Promise<Record<string, unknown>> => {
    const get = scope(req)
    const values = await Promise.all(providers.map(get))
    const out: Record<string, unknown> = {}
    for (let i = 0; i < keys.length; i++) out[keys[i]!] = values[i]
    return out
  }
}
