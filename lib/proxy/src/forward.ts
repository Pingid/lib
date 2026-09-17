import { requestHeaders, responseHeaders, type Filters } from './headers.js'
import { strip, toUpstream, type Route } from './route.js'

/** A gateway-level failure — the upstream, not the app behind it, is what went wrong. */
export class ProxyError extends Error {
  override name = 'ProxyError'
  status: number
  constructor(status: number, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.status = status
  }
  /** The plain response to hand back to the client. */
  get response() {
    return new Response(this.message, { status: this.status })
  }
}

export type ForwardOptions = {
  filters?: Filters
  /** Extra request headers, applied last — `x-forwarded-for`, an upstream credential. */
  headers?: HeadersInit
  /** Substitute transport. Useful for tests, retries, or a pooled agent. */
  fetch?: typeof fetch
}

/** Statuses the Response constructor refuses to pair with a body. */
const BODILESS = new Set([204, 205, 304])

/**
 * Send a request to a route's upstream and return its response, rewritten.
 *
 * The request path is taken from the request itself minus `route.prefix`, so a
 * route and a request are all this needs. Bodies stream both ways — nothing is
 * buffered — and redirects are passed through rather than followed, since the
 * client is the one that has to see them.
 *
 * Throws {@link ProxyError} when the upstream cannot be reached; a client that
 * hangs up mid-flight aborts instead, and its `AbortError` is rethrown as-is.
 */
export const forward = async (request: Request, route: Route, options: ForwardOptions = {}): Promise<Response> => {
  const from = new URL(request.url)
  const target = toUpstream(route, strip(route, from.pathname), from.search)

  const headers = requestHeaders(request.headers, route, from.host, options.filters)
  new Headers(options.headers).forEach((v, k) => headers.set(k, v))

  let upstream: Response
  try {
    upstream = await (options.fetch ?? fetch)(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
      signal: request.signal,
      // Required to stream a request body; not yet in lib.dom's RequestInit.
      duplex: 'half',
    } as RequestInit)
  } catch (cause) {
    if (request.signal.aborted) throw cause
    throw new ProxyError(502, `Bad gateway: ${route.upstream.origin}`, { cause })
  }

  return new Response(BODILESS.has(upstream.status) ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream.headers, route),
  })
}
