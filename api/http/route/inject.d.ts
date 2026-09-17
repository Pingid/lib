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
/** The values a route's `inject` resolves to. */
export type Injected<D> = {
    [K in keyof D]: D[K] extends Provider<any> ? Awaited<ReturnType<D[K]>> : never;
};
/** A provider swapped for another, e.g. a fake in tests. */
export type Override = readonly [Provider<any>, Provider<any>];
export declare const override: <T>(provider: Provider<T>, by: Provider<NoInfer<T>>) => Override;
/** Start a fresh scope for a request. Routers call this; call it yourself only to apply overrides. */
export declare const open: (req: Request, overrides?: ReadonlyMap<Provider<any>, Provider<any>>) => Get;
/** The request's scope, opened on first use. */
export declare const scope: (req: Request) => Get;
/** Resolve a provider for a request, e.g. from middleware. Shares the route's cache. */
export declare const inject: <T>(req: Request, provider: Provider<T>) => Promise<T>;
/** A provider built once for the process rather than per request. A failed build is retried. */
export declare const once: <T>(build: () => P<T>) => Provider<T>;
/** Resolve `inject` in parallel into an object keyed like it. */
export declare const resolver: (inject: Injects) => (req: Request) => Promise<Record<string, unknown>>;
export {};
