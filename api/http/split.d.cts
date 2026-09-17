import { TObject } from '@sinclair/typebox';
import { Schema } from '../core/index.cjs';
import { Route } from './route.cjs';
export declare namespace Split {
    interface Parts {
        params?: TObject;
        query?: TObject;
        headers?: TObject;
        cookie?: TObject;
        body?: TObject;
    }
}
/**
 * The flat input schema as one object per source, for adapters that validate ahead of the
 * handler.
 *
 * Property schemas are reused **by reference**, so `OptionalKind`, refinements and transforms
 * ride along and `Type.Object` recomputes `required` from the markers. `Type.Pick` would be the
 * obvious tool and cannot be used: it keys the result by the *input* key, while a framework
 * needs the wire name (`x-request-id`, not `requestId`), and it drops the parent's
 * `additionalProperties` — which is the wrong default in opposite directions for query and body.
 *
 * A standard schema yields nothing. Approximating one as TypeBox would hand the framework a
 * validator that disagrees with the real one, so those routes validate once, in `Schema.validate`.
 */
export declare const split: (schema: Schema.Type | undefined, bindings: Route.Bindings) => Split.Parts;
