/**
 * The one place the three adapters agree on what a response looks like.
 *
 * `undefined` is 204 rather than the string "undefined", and a `Response` a handler built
 * itself is passed straight through — the escape hatch for streaming and redirects.
 */
export declare const ok: (value: unknown) => Response;
/** A `HttpError` becomes its response; anything else is a bug and propagates untouched. */
export declare const fail: (error: unknown) => Response;
