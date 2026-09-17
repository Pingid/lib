import { Schema } from '../../../core/index.js';
import { RouteSpec } from '../types.js';
export interface ExtractorOptions<R = Request, S = Schema.Type> {
    body?: Extractor<R, S>;
    query?: Extractor<R, S>;
    path?: Extractor<R, S>;
}
type Extractor<R, S> = (req: R, schema: S) => any | Promise<any>;
export declare const extractor: <R extends Request, I extends Pick<RouteSpec, "body" | "query" | "params">>(e?: ExtractorOptions<R, I["body"] | I["query"] | I["params"]>) => (rt: I) => (req: R) => Promise<{
    body: any;
    query: any;
    path: any;
}>;
/** Rejects with a 422 `Response`, which the route adapter returns as-is. */
export declare const validate: (schema: Schema.Type, value: unknown) => Promise<any>;
export {};
