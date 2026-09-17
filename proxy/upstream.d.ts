import { RequestPolicy, ResponsePolicy } from './request.js';
import { ProxyContext } from './context.js';
export interface Upstream {
    /** Target origin. A pathname here becomes `basePath`, e.g. "https://svc.local/v2". */
    origin: string | URL;
    /** Prefix on the *incoming* path to remove before forwarding, e.g. "/api". Defaults to none. */
    stripPrefix?: string;
    /** Prefix to prepend on the *upstream* path. Defaults to the pathname of `origin`. */
    basePath?: string;
    /** Rewrite Location/Set-Cookie on the way back so they point at the proxy. Default true. */
    rewriteBack?: boolean;
    /** Send the upstream's own host in `Host`, rather than the one the client asked for. */
    setHost?: boolean;
    /** Time to first byte, in ms. Exceeded, the request becomes a 504. */
    timeout?: number;
    /** Extra request policy, applied after the proxy has retargeted the request. */
    request?: RequestPolicy;
    /** Extra response policy, applied after the proxy has rewritten the response. */
    response?: ResponsePolicy;
    /** Pseudonym for a `Via` entry, e.g. "edge-1". Omitted, no `Via` is added. */
    via?: string;
    /** Turn a failure into a response yourself. By default a `ProxyError` becomes its `.response`. */
    onError?: (error: unknown, request: Request, context: ProxyContext) => Response | Promise<Response>;
    /**
     * Substitute transport. Useful for tests, retries, or a pooled agent.
     *
     * Deliberately narrower than `typeof fetch`: the proxy only ever calls it with
     * a single `Request`, and the full type carries statics (`preconnect`) that
     * nothing implementing a transport has any reason to provide.
     */
    fetch?: (request: Request) => Promise<Response>;
}
export type UpstreamTarget = Upstream | string | URL;
export interface ResolvedUpstream {
    origin: string;
    host: string;
    basePath: string;
    stripPrefix: string;
    rewriteBack: boolean;
    setHost: boolean;
    timeout?: number;
    request?: RequestPolicy;
    response?: ResponsePolicy;
    via?: string;
    onError?: (error: unknown, request: Request, context: ProxyContext) => Response | Promise<Response>;
    fetch?: (request: Request) => Promise<Response>;
    source: UpstreamTarget;
}
export declare function normalizeUpstream(target: UpstreamTarget): ResolvedUpstream;
/** incoming path → upstream path */
export declare function forwardPath(u: ResolvedUpstream, pathname: string): string;
/** upstream path → incoming path (for Location, Content-Location, cookie Path) */
export declare function reversePath(u: ResolvedUpstream, pathname: string): string;
/**
 * A URL reference the upstream produced, mapped onto one the client can follow.
 *
 * Three kinds are returned untouched, each for its own reason. A *relative*
 * reference ("login") resolves against the request URL, which is already inside
 * the proxy, so it is right as it stands. A *protocol-relative* one
 * ("//cdn.test/x") names another host by definition. An absolute URL on a
 * foreign origin is going somewhere this proxy does not serve — a proxy is not
 * a jail, and a redirect to a login provider is exactly what one is for.
 *
 * An *absolute path* ("/login") is the case a naive `new URL(value)` guard
 * drops on the floor: it has no origin of its own because it resolved against
 * the upstream's, which makes it ours, and it is by far the common one.
 *
 * The result is a path, never an absolute URL. A proxy cannot reliably name its
 * own public origin — behind a TLS terminator or a container port-map,
 * `new URL(request.url).origin` is an internal address, and believing
 * `X-Forwarded-Host` instead requires a trusted peer. A path reference resolves
 * against whatever the client actually typed, so it is always right, and
 * RFC 9110 §10.2.2 has allowed one since RFC 7231.
 *
 * Query and fragment are carried across as text rather than through `URL`, so
 * percent-encoding survives byte for byte.
 */
export declare function reverseUrl(u: ResolvedUpstream, value: string): string;
/**
 * A proxy-facing absolute URL mapped onto the upstream, or null when it was
 * never ours to rewrite. Used for `Referer`, which describes the *proxy's*
 * origin — an address the upstream has never heard of.
 *
 * `from` is the incoming request's URL, and the host check against it is what
 * keeps a referer from an unrelated site from being rewritten as though the
 * client had come from us.
 */
export declare function forwardUrl(u: ResolvedUpstream, value: string, from: URL): string | null;
