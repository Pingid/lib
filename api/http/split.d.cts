import { TObject } from '@sinclair/typebox';
import { Schema } from '../core/index.cjs';
import type * as Route from './route.cjs';
export interface Parts {
    params?: TObject;
    query?: TObject;
    headers?: TObject;
    cookie?: TObject;
    body?: TObject;
}
/**
 * The flat input schema as one object per source, for adapters that validate ahead of the
 * handler. Property schemas are reused by reference, so refinements and `OptionalKind` ride
 * along. `Type.Pick` cannot do this: it keys by the *input* key where a framework needs the
 * wire name, and drops the parent's `additionalProperties`.
 *
 * A standard schema yields nothing — approximating one as TypeBox would give the framework a
 * validator that disagrees with the real one, so those routes validate once in `Schema.validate`.
 *
 * @example
 * ```ts
 * of(schema, route.bindings) // { params: TObject, query: TObject, headers: TObject }
 * ```
 */
export declare const of: (schema: Schema.Type | undefined, bindings: Route.Bindings) => Parts;
