import type { Schema } from '../core/index.ts'

export declare namespace HttpError {
  interface Options {
    status?: number
    body?: unknown
  }
}

/**
 * A failure the request caused, rather than the handler. Parallel to `CliError`: enough for an
 * adapter to render a response and nothing about how. Anything else is a bug and propagates
 * untouched, which leaves each framework's own error handling in charge.
 *
 * @example
 * ```ts
 * throw HttpError.notFound({ id })
 * throw new HttpError('too large', { status: 413 })
 * ```
 */
export class HttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, options: HttpError.Options = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = options.status ?? 500
    this.body = options.body ?? { error: message }
  }

  /**
   * Validation failure, as 422 — what Elysia's own validation returns, so one status covers all
   * three adapters. Issues pass through unreshaped: the same `Schema.Issue[]` the CLI renders.
   *
   * @example
   * ```ts
   * HttpError.fromIssues(result.error).body
   * // { error: 'validation', issues: [{ path: 'page', message: 'Expected integer' }] }
   * ```
   */
  static fromIssues(issues: Schema.Issue[]): HttpError {
    return new HttpError('validation', { status: 422, body: { error: 'validation', issues } })
  }

  static notFound(body?: unknown): HttpError {
    return new HttpError('not found', { status: 404, body: body ?? { error: 'not found' } })
  }
}
