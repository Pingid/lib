import { HttpError } from './error.ts'

/**
 * The one place the three adapters agree on what a response looks like.
 *
 * `undefined` is 204 rather than the string "undefined", and a `Response` a handler built
 * itself is passed straight through — the escape hatch for streaming and redirects.
 */
export const ok = (value: unknown): Response => {
  if (value instanceof Response) return value
  if (value === undefined) return new Response(null, { status: 204 })
  return Response.json(value as never)
}

/** A `HttpError` becomes its response; anything else is a bug and propagates untouched. */
export const fail = (error: unknown): Response => {
  if (!(error instanceof HttpError)) throw error
  return Response.json(error.body as never, { status: error.status })
}
