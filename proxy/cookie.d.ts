import { Pattern, PatternArg } from './util.js';
import { BasePolicy } from './base.js';
import { ProxyContext } from './context.js';
export declare class SetCookiePolicy extends BasePolicy<SetCookie, SetCookie | null> {
    constructor();
    static create(): SetCookiePolicy;
    /** Drop cookies matching the predicate. */
    drop(predicate: (cookie: SetCookie) => boolean): this;
    excludeNames(...names: PatternArg[]): this;
    /** Retarget at the proxy's domain. `null` clears Domain, scoping to the host. */
    domain(to: string | null, from?: Pattern): this;
    /**
     * Re-prefix an explicit `Path` for an upstream mounted under a subpath.
     *
     * A cookie with no `Path` at all is left alone. The browser already defaults
     * it to the directory of the response that set it — which the client fetched
     * from the proxy, so it is already right — and writing one in would only
     * narrow the cookie to a path the client may never visit.
     */
    pathPrefix(from: string, to: string): this;
    /**
     * Fit a cookie to the leg the proxy actually serves the client over.
     *
     * The upstream's connection and the client's are not the same one, and only
     * one of them may be TLS. A `Secure` cookie handed to a client over plain
     * http is silently discarded — the login simply never works — and browsers
     * reject `SameSite=None` without `Secure`, so the two come off together.
     *
     * This is the inverse of `harden`, which only ever tightens. Tightening is
     * the wrong direction when the proxy is the weaker leg. Over TLS there is
     * nothing to fix, so this leaves the cookie exactly as the upstream set it.
     *
     * Left to itself it reads `context.clientTls`, which the handler works out
     * per request; pass `tls` to decide it yourself. Unknown counts as *not* TLS:
     * guessing "secure" throws the cookie away, while guessing "plain" only
     * widens it by one hop the client has already made in the clear.
     */
    secureFor(tls?: boolean): this;
    /** Arbitrary per-cookie transform. Return null to drop the cookie. */
    map(fn: (cookie: SetCookie, context: ProxyContext) => SetCookie | null): this;
    harden(options?: {
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: 'Strict' | 'Lax' | 'None';
        partitioned?: boolean;
        maxAge?: number;
    }): this;
    /** Cap cookie lifetime without extending short-lived ones. */
    capMaxAge(seconds: number): this;
    rename(from: string, to: string): this;
    prefixNames(prefix: string): this;
}
/** The request `Cookie` header: an ordered list of name=value pairs. */
export declare class CookieSet {
    private pairs;
    private constructor();
    static parse(header: string): CookieSet;
    get(name: string): string | undefined;
    has(name: string): boolean;
    set(name: string, value: string): this;
    /** Keep only cookies for which the predicate returns true. */
    filter(predicate: (name: string, value: string) => boolean): this;
    exclude(...names: PatternArg[]): this;
    keep(...names: PatternArg[]): this;
    rename(from: string, to: string): this;
    get size(): number;
    toString(): string;
}
/** A single `Set-Cookie` value: name, value and its attributes. */
export declare class SetCookie {
    name: string;
    value: string;
    private attrs;
    private constructor();
    /** A fresh cookie with no attributes. `parse` covers the other direction. */
    static of(name: string, value: string): SetCookie;
    static parse(raw: string): SetCookie;
    get(attribute: string): string | true | undefined;
    set(attribute: string, value: string | true): this;
    remove(attribute: string): this;
    private flag;
    get domain(): string | null | undefined;
    set domain(v: string | null | undefined);
    get path(): string | null | undefined;
    set path(v: string | null | undefined);
    get sameSite(): string | null | undefined;
    set sameSite(v: string | null | undefined);
    get secure(): boolean;
    set secure(on: boolean);
    get httpOnly(): boolean;
    set httpOnly(on: boolean);
    toString(): string;
}
