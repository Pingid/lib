import { Operation, Namespace } from '../types.js';
export declare const operation: (n: Namespace | Operation.Any) => n is Operation.Any;
export declare const namespace: (n: Namespace | Operation.Any) => n is Namespace;
/**
 * Observed rather than declared: a handler may hand back an iterable whatever
 * its `out` says, and once a value exists the value is the better authority.
 */
export declare const stream: (v: unknown) => v is AsyncIterable<unknown>;
