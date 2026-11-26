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

/**
 * The values a route's `inject` resolves to.
 *
 * @example
 * const deps = { user, db }
 * type Deps = Injected<typeof deps> // { user: User; db: Db }
 */
export type Injected<D> = { [K in keyof D]: D[K] extends Provider<any> ? Awaited<ReturnType<D[K]>> : never }

/** A provider swapped for another, e.g. a fake in tests. */
export type Override = readonly [Provider<any>, Provider<any>]

/**
 * Swap `provider` for `by` on every route below a router. `by` must produce the same type.
 *
 * @example
 * const test = Router({ override: [override(user, () => ({ id: 'fake' }))], routes: [Update] })
 */
export const override = <T>(provider: Provider<T>, by: Provider<NoInfer<T>>): Override => [provider, by]

const scopes = new WeakMap<Request, Get>()

/**
 * Start a fresh scope for a request. Routers call this; call it yourself only to apply overrides.
 *
 * @example
 * // a standalone route, with a fake user for this request only
 * open(req, new Map([[user, () => ({ id: 'fake' })]]))
 * await Update.fetch(req)
 */
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

/**
 * Resolve a provider for a request, e.g. from middleware. Shares the route's cache.
 *
 * @example
 * const signedIn = guard(async (req) => !!(await inject(req, session)))
 */
export const inject = <T>(req: Request, provider: Provider<T>): Promise<T> => scope(req)(provider)

/**
 * A provider built once for the process rather than per request. A failed build is retried.
 *
 * @example
 * const db = once(() => connect(process.env.DB_URL!))
 * Route('/apps', { inject: { db }, handle: async (c, { db }) => c.json(await db.apps()) })
 */
export const once = <T>(build: () => P<T>): Provider<T> => {
  let v: Promise<T> | undefined
  return () =>
    (v ??= (async () => build())().catch((e) => {
      v = undefined
      throw e
    }))
}

/**
 * A typed provider with no implementation, filled by an `override` on a router above the routes using it.
 * Resolving one that was never filled throws, so a missing binding fails loudly rather than as `undefined`.
 *
 * @example
 * const db = slot<Db>('db')
 * Router({ override: [override(db, once(() => connect(env.DB_URL)))], routes })
 */
export const slot = <T>(name: string): Provider<T> => {
  const p: Provider<T> = () => {
    throw new Error(`Provider slot '${name}' was not filled; bind it with override(${name}, ...)`)
  }
  Object.defineProperty(p, 'name', { value: name })
  return p
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
