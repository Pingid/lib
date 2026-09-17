/**
 * A gateway-level failure — the upstream, not the app behind it, is what went wrong.
 *
 * Carrying the status on the error is what lets a policy step refuse a request
 * (`readOnly()` throws a 405) and have the handler turn that into a real
 * response, rather than an unhandled rejection the caller has to decode.
 */
export class ProxyError extends Error {
  override readonly name = 'ProxyError'
  readonly status: number

  constructor(status: number, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.status = status
  }

  /** The plain response to hand back to the client. */
  get response(): Response {
    return new Response(this.message, {
      status: this.status,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
}
