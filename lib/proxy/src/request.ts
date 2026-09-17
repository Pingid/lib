import { forwardPath, normalizeUpstream, type ResolvedUpstream, type UpstreamTarget } from './upstream.ts'
import { type ForwardedInfo, HeaderPolicy } from './header.ts'
import { BasePolicy, compose } from './base.ts'
import { ProxyError } from './error.ts'
import type { ProxyContext } from './context.ts'

export class RequestPolicy extends BasePolicy<Request, Promise<Request>> {
  constructor() {
    super(compose.asyncPipe<Request>(), async (request) => request)
  }

  static create() {
    return new RequestPolicy()
  }

  /** Run a HeaderPolicy over a mutable copy and rebuild. */
  headers(policy: HeaderPolicy) {
    return this.step(async (request, context) =>
      rebuildRequest(request, { headers: policy.copyOf(request.headers, context) }),
    )
  }

  /** Arbitrary per-request transform — the escape hatch the other methods are sugar for. */
  map(fn: (request: Request, context: ProxyContext) => Request | Promise<Request>) {
    return this.step(async (request, context) => fn(request, context))
  }

  url(map: (url: URL, request: Request) => URL | string | Promise<URL | string>) {
    return this.step(async (request) => {
      const next = await map(new URL(request.url), request)
      return rebuildRequest(request, { url: next })
    })
  }

  method(map: (method: string) => string) {
    return this.step(async (request) => rebuildRequest(request, { method: map(request.method) }))
  }

  /**
   * Point the request at an upstream origin. A path on `target` is prepended;
   * `stripPrefix` removes a local mount point first.
   */
  upstream(target: UpstreamTarget) {
    const resolved = normalizeUpstream(target)
    return this.step(async (request) => applyUpstream(request, resolved))
  }

  /**
   * Strip client-supplied provenance and record the real client.
   * Only extends an existing chain when the peer is trusted.
   */
  forwarded(
    resolve: (request: Request, context: ProxyContext) => ForwardedInfo,
    options: { standard?: boolean; via?: string } = {},
  ) {
    return this.step(async (request, context) => {
      // Whether the peer can be believed is a fact about *this* request, so the
      // small policy that depends on it is built here rather than at startup.
      const trusted = context.trustedPeer === true
      const policy = HeaderPolicy.create()
        .when(!trusted, (p) => p.excludeTypes('FORWARDING'))
        .forwarded(resolve(request, context), { mode: trusted ? 'append' : 'replace', standard: options.standard })
        .when(options.via != null, (p) => p.via(options.via!))
      return rebuildRequest(request, { headers: policy.copyOf(request.headers, context) })
    })
  }

  /**
   * Abort the upstream call after `ms`, without detaching from client cancellation.
   *
   * This is a deadline on the whole exchange, body included — a timeout signal
   * cannot be cleared once started — so it will cut off a long download or an
   * open event stream. It produces a plain abort, not a 504; for a
   * time-to-first-byte deadline that answers with one, set `timeout` on the
   * upstream instead.
   */
  timeout(ms: number) {
    return this.step(async (request) =>
      rebuildRequest(request, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(ms)]) }),
    )
  }

  /** Read-only proxy: turn writes into a rejection you can catch upstream. */
  readOnly(allowed: readonly string[] = ['GET', 'HEAD', 'OPTIONS']) {
    const set = new Set(allowed.map((m) => m.toUpperCase()))
    return this.step(async (request) => {
      if (!set.has(request.method.toUpperCase())) throw new ProxyError(405, `Method ${request.method} not allowed`)
      return request
    })
  }

  /** Inspect without modifying — logging, metrics, auth checks that throw. */
  inspect(fn: (request: Request, context: ProxyContext) => unknown | Promise<unknown>) {
    return this.step(async (request, context) => {
      await fn(request, context)
      return request
    })
  }
}

export class ResponsePolicy extends BasePolicy<Response, Promise<Response>> {
  constructor() {
    super(compose.asyncPipe<Response>(), async (response) => response)
  }

  static create() {
    return new ResponsePolicy()
  }

  headers(policy: HeaderPolicy) {
    return this.step(async (response, context) =>
      rebuildResponse(response, { headers: policy.copyOf(response.headers, context) }),
    )
  }

  /** Arbitrary per-response transform — the escape hatch the other methods are sugar for. */
  map(fn: (response: Response, context: ProxyContext) => Response | Promise<Response>) {
    return this.step(async (response, context) => fn(response, context))
  }

  status(map: (status: number, response: Response) => number) {
    return this.step(async (response) => rebuildResponse(response, { status: map(response.status, response) }))
  }

  /** Replace the body when a predicate matches — error pages, upstream leak masking. */
  replaceWhen(predicate: (response: Response) => boolean, build: (response: Response) => Response | Promise<Response>) {
    return this.step(async (response) => (predicate(response) ? build(response) : response))
  }

  /** Hide upstream 5xx detail from clients while keeping the status. */
  maskServerErrors(body = 'Upstream error') {
    return this.replaceWhen(
      (response) => response.status >= 500,
      (response) => {
        void response.body?.cancel()
        return new Response(body, { status: 502, headers: { 'content-type': 'text/plain' } })
      },
    )
  }

  /** Inspect without modifying — logging, metrics, anything that only reads. */
  inspect(fn: (response: Response, context: ProxyContext) => unknown | Promise<unknown>) {
    return this.step(async (response, context) => {
      await fn(response, context)
      return response
    })
  }
}

const BODYLESS_METHODS = new Set(['GET', 'HEAD'])
const NULL_BODY_STATUS = new Set([204, 205, 304])

interface RequestPatch {
  url?: string | URL
  method?: string
  headers?: HeadersInit
  body?: BodyInit | null
  signal?: AbortSignal
}

export function rebuildRequest(request: Request, patch: RequestPatch = {}): Request {
  const method = (patch.method ?? request.method).toUpperCase()
  const body = BODYLESS_METHODS.has(method) ? null : patch.body !== undefined ? patch.body : request.body

  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers: patch.headers ?? request.headers,
    body,
    redirect: 'manual',
    signal: patch.signal ?? request.signal,
  }
  // Streaming request bodies require half-duplex in undici; not yet in lib.dom.
  if (body != null && typeof (body as ReadableStream).getReader === 'function') init.duplex = 'half'

  return new Request(patch.url ?? request.url, init)
}

interface ResponsePatch {
  status?: number
  statusText?: string
  headers?: HeadersInit
  body?: BodyInit | null
}

export function rebuildResponse(response: Response, patch: ResponsePatch = {}): Response {
  const status = patch.status ?? response.status
  const forced = NULL_BODY_STATUS.has(status)
  // A body we are about to drop still holds a socket open until it is cancelled.
  if (forced) void response.body?.cancel()
  const body = forced ? null : patch.body !== undefined ? patch.body : response.body

  return new Response(body, {
    status,
    statusText: patch.statusText ?? response.statusText,
    headers: patch.headers ?? response.headers,
  })
}

export function applyUpstream(request: Request, u: ResolvedUpstream): Request {
  const url = new URL(request.url)
  const next = new URL(`${forwardPath(u, url.pathname)}${url.search}`, u.origin)
  const headers = u.setHost ? new Headers(request.headers) : request.headers
  if (u.setHost) (headers as Headers).set('host', u.host)
  return rebuildRequest(request, { url: next, headers })
}
