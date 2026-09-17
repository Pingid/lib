import { ResolvedUpstream, UpstreamTarget } from './upstream.js';
import { ForwardedInfo, HeaderPolicy } from './header.js';
import { BasePolicy } from './base.js';
import { ProxyContext } from './context.js';
export declare class RequestPolicy extends BasePolicy<Request, Promise<Request>> {
    constructor();
    static create(): RequestPolicy;
    /** Run a HeaderPolicy over a mutable copy and rebuild. */
    headers(policy: HeaderPolicy): this;
    /** Arbitrary per-request transform — the escape hatch the other methods are sugar for. */
    map(fn: (request: Request, context: ProxyContext) => Request | Promise<Request>): this;
    url(map: (url: URL, request: Request) => URL | string | Promise<URL | string>): this;
    method(map: (method: string) => string): this;
    /**
     * Point the request at an upstream origin. A path on `target` is prepended;
     * `stripPrefix` removes a local mount point first.
     */
    upstream(target: UpstreamTarget): this;
    /**
     * Strip client-supplied provenance and record the real client.
     * Only extends an existing chain when the peer is trusted.
     */
    forwarded(resolve: (request: Request, context: ProxyContext) => ForwardedInfo, options?: {
        standard?: boolean;
        via?: string;
    }): this;
    /**
     * Abort the upstream call after `ms`, without detaching from client cancellation.
     *
     * This is a deadline on the whole exchange, body included — a timeout signal
     * cannot be cleared once started — so it will cut off a long download or an
     * open event stream. It produces a plain abort, not a 504; for a
     * time-to-first-byte deadline that answers with one, set `timeout` on the
     * upstream instead.
     */
    timeout(ms: number): this;
    /** Read-only proxy: turn writes into a rejection you can catch upstream. */
    readOnly(allowed?: readonly string[]): this;
    /** Inspect without modifying — logging, metrics, auth checks that throw. */
    inspect(fn: (request: Request, context: ProxyContext) => unknown | Promise<unknown>): this;
}
export declare class ResponsePolicy extends BasePolicy<Response, Promise<Response>> {
    constructor();
    static create(): ResponsePolicy;
    headers(policy: HeaderPolicy): this;
    /** Arbitrary per-response transform — the escape hatch the other methods are sugar for. */
    map(fn: (response: Response, context: ProxyContext) => Response | Promise<Response>): this;
    status(map: (status: number, response: Response) => number): this;
    /** Replace the body when a predicate matches — error pages, upstream leak masking. */
    replaceWhen(predicate: (response: Response) => boolean, build: (response: Response) => Response | Promise<Response>): this;
    /** Hide upstream 5xx detail from clients while keeping the status. */
    maskServerErrors(body?: string): this;
    /** Inspect without modifying — logging, metrics, anything that only reads. */
    inspect(fn: (response: Response, context: ProxyContext) => unknown | Promise<unknown>): this;
}
interface RequestPatch {
    url?: string | URL;
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    signal?: AbortSignal;
}
export declare function rebuildRequest(request: Request, patch?: RequestPatch): Request;
interface ResponsePatch {
    status?: number;
    statusText?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
}
export declare function rebuildResponse(response: Response, patch?: ResponsePatch): Response;
export declare function applyUpstream(request: Request, u: ResolvedUpstream): Request;
export {};
