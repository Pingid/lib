import { validate } from '../route/context/extract.ts'
import { open, type Override, type Provider } from '../route/inject.ts'
import * as Route from '../route/index.ts'

type P<T> = T | Promise<T>

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------

/** A request handler as the router runs it. */
export type Fetch = (req: Request) => Promise<Response>

/**
 * Wraps the rest of the chain: CORS, timing, guards, error pages. Throw or return a `Response` to stop.
 * Data belongs in providers; read one here with `inject(req, provider)` and the route shares the result.
 *
 * Chains are composed once, when the router compiles, never per request.
 *
 * @example
 * const timing: Middleware = (next) => async (req) => {
 *   const t = performance.now()
 *   const res = await next(req)
 *   res.headers.set('server-timing', `app;dur=${performance.now() - t}`)
 *   return res
 * }
 */
export type Middleware = (next: Fetch) => (req: Request) => P<Response>

/** Outermost first. */
export const compose = (use: readonly Middleware[], handler: Fetch): Fetch =>
  use.reduceRight<Fetch>((next, mw) => {
    const run = mw(next)
    return async (req) => run(req)
  }, handler)

/** Continue only when `check` passes; otherwise answer with its `Response`, or 403. */
export const guard =
  (check: (req: Request) => P<boolean | Response>): Middleware =>
  (next) =>
  async (req) => {
    const ok = await check(req)
    if (ok === true) return next(req)
    return ok instanceof Response ? ok : new Response('Forbidden', { status: 403 })
  }

// ------------------------------------------------------------------
// Router
// ------------------------------------------------------------------

/** A route or a nested router. */
export type Node = Route.Route<any, any, any> | Router<any>

export interface RouterOptions<R extends readonly Node[] = readonly Node[]> {
  /** Prepended to every route below. */
  prefix?: string
  /** Middleware for every route below, after the parent's. */
  use?: readonly Middleware[]
  /** Providers swapped for every route below, e.g. fakes in tests. */
  override?: readonly Override[]
  /** Answer for unmatched paths. Read from the router `fetch` is called on. */
  notFound?: Fetch
  routes: R
}

/**
 * Configuration only: nothing runs per request until `fetch` first compiles the tree into a flat table.
 *
 * `N` is the context the routes need from outside `inject`. A router provides it with `context`, and
 * `fetch` is only callable once nothing is missing.
 */
export interface Router<N = {}> {
  readonly options: RouterOptions & { context?: (req: Request) => unknown }
  readonly fetch: {} extends N ? Fetch : MissingContext<N>
  /** Phantom, for inference. */
  readonly '~needs'?: N
}

type MissingContext<N> = { error: 'Pass `context` to a router: these routes need it'; needs: N }

/** The context a set of nodes needs from outside `inject`. */
export type Needs<R extends readonly Node[]> = Route.Intersect<{ [K in keyof R]: NeedsOf<R[K]> }[number]>
type NeedsOf<T> = T extends Router<infer N> ? N : T extends Route.Route<any, infer C, any> ? C : never

/**
 * @example
 * const api = Router({
 *   prefix: '/api',
 *   use: [timing],
 *   routes: [List, Router({ use: [guard(isSignedIn)], routes: [Create, Update] })],
 * })
 * Bun.serve({ fetch: api.fetch })
 */
export const Router: {
  <const R extends readonly Node[]>(
    options: RouterOptions<R> & { context: (req: Request) => P<Needs<R>> },
  ): Router<{}>
  <const R extends readonly Node[]>(options: RouterOptions<R>): Router<Needs<R>>
} = (options: Router['options']): Router<any> => {
  let compiled: Fetch | undefined
  const node: Router<any> = { options, fetch: (req: Request) => (compiled ??= compile(node))(req) }
  return node
}

// ------------------------------------------------------------------
// Flatten
// ------------------------------------------------------------------

/** A route as mounted: its full path and everything its ancestors apply, outermost first. */
export interface Entry {
  method: string
  path: string
  route: Route.Route<any, any, any>
  use: readonly Middleware[]
  override: readonly Override[]
  context?: ((req: Request) => unknown) | undefined
}

type Scope = Omit<Entry, 'method' | 'route'>

/** The tree as one list, in declaration order. Adapters can mount this directly. */
export const flatten = (node: Router<any>, parent: Scope = { path: '', use: [], override: [] }): Entry[] => {
  const o = node.options
  const scope: Scope = {
    path: join(parent.path, o.prefix ?? ''),
    use: o.use?.length ? [...parent.use, ...o.use] : parent.use,
    override: o.override?.length ? [...parent.override, ...o.override] : parent.override,
    context: o.context ?? parent.context,
  }
  return o.routes.flatMap((r): Entry[] => {
    if (isRouter(r)) return flatten(r, scope)
    if (r.spec.path === undefined) throw new Error('Router: a route needs a path to be mounted')
    return [{ ...scope, route: r, method: r.spec.method ?? 'GET', path: join(scope.path, r.spec.path) }]
  })
}

const isRouter = (n: Node): n is Router<any> => 'options' in n

// ------------------------------------------------------------------
// Compile
// ------------------------------------------------------------------
type Params = Record<string, string>
type Dispatch = (req: Request, params: Params) => Promise<Response>
type Methods = Record<string, Dispatch>
interface Dynamic {
  re: RegExp
  keys: string[]
  methods: Methods
}

const NO_PARAMS: Params = Object.freeze({}) as Params
const notFound: Fetch = async () => new Response('Not Found', { status: 404 })

/**
 * Static paths are one `Map` lookup. Dynamic paths are bucketed by their first segment when it is static,
 * so `/apps/:slug` is only tried for `/apps/...`; those with a dynamic first segment are tried last.
 */
const compile = (root: Router<any>): Fetch => {
  const exact = new Map<string, Methods>()
  const buckets = new Map<string, Dynamic[]>()
  const patterns = new Map<string, Dynamic>()

  for (const e of flatten(root)) {
    const pattern = parse(e.path)
    let methods: Methods
    if (!pattern) {
      methods = exact.get(e.path) ?? {}
      exact.set(e.path, methods)
    } else {
      let d = patterns.get(e.path)
      if (!d) {
        patterns.set(e.path, (d = { ...pattern, methods: {} }))
        const key = bucketOf(e.path)
        buckets.set(key, [...(buckets.get(key) ?? []), d])
      }
      methods = d.methods
    }
    if (methods[e.method]) throw new Error(`Router: ${e.method} ${e.path} is mounted twice`)
    methods[e.method] = dispatcher(e)
  }

  const fallback = root.options.notFound ?? notFound
  const wildcard = buckets.get(':')

  return (req) => {
    const path = trimSlash(pathname(req.url))
    let methods = exact.get(path)
    let params = NO_PARAMS
    if (!methods) {
      const hit = match(buckets.get(firstSegment(path)), path) ?? match(wildcard, path)
      if (!hit) return fallback(req)
      ;[methods, params] = hit
    }
    // HEAD falls back to GET; servers drop the body
    const run = methods[req.method] ?? (req.method === 'HEAD' ? methods['GET'] : undefined)
    if (run) return run(req, params)
    return Promise.resolve(
      new Response('Method Not Allowed', { status: 405, headers: { Allow: Object.keys(methods).join(', ') } }),
    )
  }
}

/** Path params by request, for the route's `path` extractor. */
const matched = new WeakMap<Request, Params>()

const dispatcher = (e: Entry): Dispatch => {
  const run = Route.adapter<Request, any, any>({
    path: (req, schema) => {
      const p = matched.get(req) ?? NO_PARAMS
      return schema ? validate(schema, p) : p
    },
    ...(e.context && { context: e.context }),
  })(e.route)
  const handle = compose(e.use, run)
  const overrides = e.override.length ? new Map<Provider<any>, Provider<any>>(e.override) : undefined
  return async (req, params) => {
    matched.set(req, params)
    // Without overrides the scope opens lazily, on the first provider asked for
    if (overrides) open(req, overrides)
    try {
      return await handle(req)
    } catch (err) {
      if (err instanceof Response) return err
      throw err
    }
  }
}

const match = (list: Dynamic[] | undefined, path: string): readonly [Methods, Params] | undefined => {
  if (list)
    for (const d of list) {
      const m = d.re.exec(path)
      if (!m) continue
      const params: Params = {}
      for (let i = 0; i < d.keys.length; i++) params[d.keys[i]!] = decode(m[i + 1]!)
      return [d.methods, params]
    }
  return undefined
}

// ------------------------------------------------------------------
// Paths
// ------------------------------------------------------------------

/** `:name` captures a segment; `prefix...` matches the rest, as in the route extractor. */
const parse = (path: string): Omit<Dynamic, 'methods'> | undefined => {
  const keys: string[] = []
  let dynamic = false
  const source = path
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        dynamic = true
        keys.push(part.slice(1))
        return '([^/]+)'
      }
      if (part.endsWith('...')) {
        dynamic = true
        return `${escape(part.slice(0, -3))}.*`
      }
      return escape(part)
    })
    .join('/')
  return dynamic ? { re: new RegExp(`^${source}$`), keys } : undefined
}

const bucketOf = (path: string) => {
  const first = firstSegment(path)
  return first.startsWith(':') || first.endsWith('...') ? ':' : first
}

const firstSegment = (path: string) => {
  const end = path.indexOf('/', 1)
  return end < 0 ? path.slice(1) : path.slice(1, end)
}

/** The pathname of an absolute URL, without allocating a `URL`. */
const pathname = (url: string) => {
  const start = url.indexOf('/', url.indexOf('://') + 3)
  if (start < 0) return '/'
  const q = url.indexOf('?', start)
  const h = url.indexOf('#', start)
  const end = q < 0 ? h : h < 0 ? q : Math.min(q, h)
  return end < 0 ? url.slice(start) : url.slice(start, end)
}

const trimSlash = (p: string) => (p.length > 1 && p.charCodeAt(p.length - 1) === 47 ? p.slice(0, -1) : p)
const join = (a: string, b: string) => trimSlash(`${a}/${b}`.replace(/\/{2,}/g, '/'))
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
