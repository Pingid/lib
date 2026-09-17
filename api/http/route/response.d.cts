import { ResponseProtocol, RouteSpecResponse } from './types.cjs';
/** Normalise the three `response` shapes into `{ [status]: { [contentType]: schema | meta } }`. */
export declare const byStatus: (r: RouteSpecResponse) => Record<string, ResponseProtocol | undefined>;
