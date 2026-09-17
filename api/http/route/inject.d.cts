type P<T> = T | Promise<T>;
/** Resolve a provider within the current request's scope. */
export type Get = <T>(provider: Provider<T>) => Promise<T>;
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
export type Provider<T = unknown> = (req: Request, get: Get) => P<T>;
export type Injects = {
    [key: string]: Provider<any>;
};
/**
 * The values a route's `inject` resolves to.
 *
 * @example
 * const deps = { user, db }
 * type Deps = Injected<typeof deps> // { user: User; db: Db }
 */
export type Injected<D> = {
    [K in keyof D]: D[K] extends Provider<any> ? Awaited<ReturnType<D[K]>> : never;
};
/** A provider swapped for another, e.g. a fake in tests. */
export type Override = readonly [Provider<any>, Provider<any>];
/**
 * Swap `provider` for `by` on every route below a router. `by` must produce the same type.
 *
 * @example
 * const test = Router({ override: [override(user, () => ({ id: 'fake' }))], routes: [Update] })
 */
export declare const override: <T>(provider: Provider<T>, by: Provider<NoInfer<T>>) => Override;
/**
 * Start a fresh scope for a request. Routers call this; call it yourself only to apply overrides.
 *
 * @example
 * // a standalone route, with a fake user for this request only
 * open(req, new Map([[user, () => ({ id: 'fake' })]]))
 * await Update.fetch(req)
 */
export declare const open: (req: Request, overrides?: ReadonlyMap<Provider<any>, Provider<any>>) => Get;
/** The request's scope, opened on first use. */
export declare const scope: (req: Request) => Get;
/**
 * Resolve a provider for a request, e.g. from middleware. Shares the route's cache.
 *
 * @example
 * const signedIn = guard(async (req) => !!(await inject(req, session)))
 */
export declare const inject: <T>(req: Request, provider: Provider<T>) => Promise<T>;
/**
 * A provider built once for the process rather than per request. A failed build is retried.
 *
 * @example
 * const db = once(() => connect(process.env.DB_URL!))
 * Route('/apps', { inject: { db }, handle: async (c, { db }) => c.json(await db.apps()) })
 */
export declare const once: <T>(build: () => P<T>) => Provider<T>;
/**
 * A typed provider with no implementation, filled by an `override` on a router above the routes using it.
 * Resolving one that was never filled throws, so a missing binding fails loudly rather than as `undefined`.
 *
 * @example
 * const db = slot<Db>('db')
 * Router({ override: [override(db, once(() => connect(env.DB_URL)))], routes })
 */
export declare const slot: <T>(name: string) => Provider<T>;
/** Resolve `inject` in parallel into an object keyed like it. */
export declare const resolver: (inject: Injects) => (req: Request) => Promise<Record<string, unknown>>;
export {};
