import { Schema } from '../core/index.js';
export declare namespace HttpError {
    interface Options {
        status?: number;
        body?: unknown;
    }
}
/**
 * A failure the request caused, rather than the handler.
 *
 * Deliberately parallel to `CliError`: carries enough for the adapter to render a response and
 * nothing about how. Anything that is not one of these is a bug and propagates untouched, which
 * is what lets each framework's own error handling stay in charge.
 */
export declare class HttpError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(message: string, options?: HttpError.Options);
    /**
     * Validation failure, as 422.
     *
     * 422 because that is what Elysia's own validation returns, and one status across the three
     * adapters keeps a framework detail out of the client's error handling. The issues are passed
     * through unreshaped — the same `Schema.Issue[]` the CLI renders as text.
     */
    static fromIssues(issues: Schema.Issue[]): HttpError;
    static notFound(body?: unknown): HttpError;
}
