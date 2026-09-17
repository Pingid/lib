import { PatternArg } from './util.js';
import { CookieSet, SetCookie, SetCookiePolicy } from './cookie.js';
import { BasePolicy } from './base.js';
import { ProxyContext } from './context.js';
export declare const HEADER_TYPE: {
    /** Connection-scoped, never forwarded. RFC 9110 §7.6.1. */
    readonly HOP_BY_HOP: readonly ["connection", "proxy-connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"];
    readonly SECURITY: readonly ["x-frame-options", "content-security-policy", "content-security-policy-report-only", "strict-transport-security", "referrer-policy", "permissions-policy", "cross-origin-opener-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy"];
    readonly TRANSFER: readonly ["alt-svc", "content-encoding", "content-length"];
    /** Client-supplied provenance claims. Strip on ingress unless the peer is trusted. */
    readonly FORWARDING: readonly ["forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port", "x-forwarded-prefix", "x-forwarded-server", "x-real-ip", "via"];
    readonly CORS: readonly ["access-control-allow-origin", "access-control-allow-credentials", "access-control-allow-headers", "access-control-allow-methods", "access-control-expose-headers", "access-control-max-age"];
    readonly CACHE: readonly ["cache-control", "pragma", "expires", "etag", "last-modified", "age", "vary"];
    readonly CREDENTIALS: readonly ["authorization", "cookie", "set-cookie"];
};
export type HeaderType = keyof typeof HEADER_TYPE;
export interface ForwardedInfo {
    /** Client address. IPv6 is bracketed and quoted automatically. */
    for?: string;
    /** Host the client originally requested, e.g. "app.example.com". */
    host?: string;
    /** "http" | "https" */
    proto?: string;
    /** Interface the proxy received the request on. */
    by?: string;
    /** Port the client originally connected to. */
    port?: string | number;
    /** Mount path the client reached this hop on, for apps that can serve under a sub-path when told which. */
    prefix?: string;
}
export interface ForwardedOptions {
    /**
     * "append" extends any existing chain — only safe when the immediate peer is
     * a trusted proxy. "replace" (the default) discards client-supplied values.
     */
    mode?: 'append' | 'replace';
    /** Emit RFC 7239 `Forwarded` in addition to the X-Forwarded-* family. */
    standard?: boolean;
}
export declare class HeaderPolicy extends BasePolicy<Headers, void> {
    constructor();
    static create(): HeaderPolicy;
    /** Run the policy over a copy. The input is never mutated. */
    copyOf(headers: HeadersInit, context?: ProxyContext): Headers;
    /**
     * Keep only headers for which the predicate returns true.
     *
     * The predicate sees `set-cookie` as one comma-joined value, because that is
     * what iterating a `Headers` gives you. Decide on the *name* here and reach
     * for `mapSetCookie` when the individual values matter.
     */
    filter(predicate: (name: string, value: string) => boolean): this;
    /** Remove headers whose name matches any pattern. Strings are case-insensitive. */
    exclude(...excludes: PatternArg[]): this;
    /** Allowlist: drop everything whose name doesn't match. */
    keep(...keeps: PatternArg[]): this;
    excludeTypes(...types: HeaderType[]): this;
    set(name: string, value: string): this;
    /** Set only if the header is absent — useful for upstream defaults. */
    default(name: string, value: string): this;
    append(name: string, value: string): this;
    rename(from: string, to: string): this;
    /** Transform one header's value. Return null to remove it. */
    mapHeader(name: string, map: (value: string) => string | null): this;
    /**
     * Strip hop-by-hop headers, including the ones named by `Connection`
     * (RFC 9110 §7.6.1). Anything listed there is connection-scoped by
     * definition and must not be forwarded.
     */
    excludeHopByHop(): this;
    /**
     * Record the client in X-Forwarded-* (and optionally RFC 7239 `Forwarded`).
     * Defaults to replacing existing values, since a client can forge them.
     */
    forwarded(info: ForwardedInfo, options?: ForwardedOptions): this;
    /** Append a `Via` entry, e.g. via('edge-1') → "1.1 edge-1". */
    via(pseudonym: string, protocol?: string): this;
    /**
     * Rewrite URL-valued headers through `map`. Returning null drops the header.
     *
     * The mapping itself lives in `reverseUrl`, which knows the difference
     * between a reference that is ours and one that merely looks like it.
     */
    mapUrls(map: (value: string) => string | null, names?: readonly string[]): this;
    /** Transform the request `Cookie` header as a set. */
    mapCookie(map: (cookies: CookieSet) => CookieSet): this;
    /** Drop request cookies by name. */
    excludeCookies(...names: PatternArg[]): this;
    /** Run a composed `SetCookiePolicy` over every `Set-Cookie`. */
    setCookies(policy: SetCookiePolicy): this;
    excludeSetCookies(...names: PatternArg[]): this;
    /** The raw per-cookie escape hatch, for a transform too small to compose. Return null to drop that cookie. */
    mapSetCookie(map: (cookie: SetCookie, context: ProxyContext) => SetCookie | null | undefined): this;
}
