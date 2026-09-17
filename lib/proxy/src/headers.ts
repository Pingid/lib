import { toProxy, toUpstream, type Route } from "./route.js";

/** Per-connection headers. Meaningless once the connection they describe is over. */
const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
] as const;

export type Filters = {
  /** Cookie *names* not passed upstream. Strings match exactly, patterns are tested against the name. */
  cookies?: readonly (string | RegExp)[];
};

/**
 * Request headers as the upstream should see them.
 *
 * `host` is the client's view of the proxy — pass the inbound URL's host so the
 * upstream can reconstruct a public URL from `x-forwarded-*` alone.
 */
export const requestHeaders = (
  from: Headers,
  r: Route,
  host?: string | null,
  filters?: Filters,
): Headers => {
  const out = new Headers(from);
  for (const k of HOP_BY_HOP) out.delete(k);
  // fetch derives both from the target and the body it actually sends.
  out.delete("host");
  out.delete("content-length");

  const cookie = filters?.cookies && from.get("cookie");
  if (cookie != null) {
    const kept = cookie.split(/;\s*/).filter((c) => c && !dropped(name(c), filters!.cookies!));
    if (kept.length) out.set("cookie", kept.join("; "));
    else out.delete("cookie");
  }

  // Both describe the *proxy's* origin; the upstream only understands its own.
  const referer = from.get("referer");
  if (referer) {
    const back = rewriteReferer(referer, r);
    if (back) out.set("referer", back);
  }
  if (from.has("origin")) out.set("origin", r.upstream.origin);

  if (host) out.set("x-forwarded-host", host);
  out.set("x-forwarded-proto", r.secure ? "https" : "http");
  // For apps that can serve under a sub-path when told which one.
  out.set("x-forwarded-prefix", r.prefix);
  return out;
};

/**
 * Response headers that do not make it back to the client.
 *
 * The first group is the point of the proxy: each one is a way for the upstream
 * to refuse to be embedded, or to make a claim about the *proxy's* origin — an
 * HSTS header from the upstream would pin the proxy's own host to TLS, an
 * `Alt-Svc` would send the client somewhere else for it. `Referrer-Policy` goes
 * because the referer is how an absolute-path request finds its way back.
 *
 * The second group describes the upstream connection's encoding, which is not
 * this one's: fetch has already decoded the body on the way through.
 */
const DROP = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "strict-transport-security",
  "referrer-policy",
  "alt-svc",
  "content-encoding",
  "content-length",
  ...HOP_BY_HOP,
]);

export const responseHeaders = (from: Headers, r: Route): Headers => {
  const out = new Headers();
  from.forEach((v, k) => {
    if (!DROP.has(k) && k !== "set-cookie") out.append(k, v);
  });
  for (const c of from.getSetCookie?.() ?? []) out.append("set-cookie", rewriteCookie(c, r));

  const location = from.get("location");
  if (location) out.set("location", rewriteLocation(location, r));
  return out;
};

/**
 * A redirect that stays on the upstream is brought back inside the proxy path,
 * path for path. Anything pointing elsewhere is left to go there: the proxy is
 * not a jail, and a login provider on another host is exactly what an absolute
 * `Location` is for. A *relative* `Location` resolves against the request URL,
 * which is already prefixed, so it is correct untouched.
 */
export const rewriteLocation = (location: string, r: Route): string => {
  if (location.startsWith("//")) return location; // protocol-relative: another host
  if (location.startsWith("/")) return toProxy(r, location);

  let target: URL;
  try {
    target = new URL(location);
  } catch {
    return location; // relative
  }
  if (target.origin !== r.upstream.origin) return location;
  return toProxy(r, target.pathname) + target.search + target.hash;
};

/**
 * The cookie is the proxy's now, so a `Domain` written for the upstream's host
 * would only get it rejected. `Secure` cannot survive a plain-http proxy
 * either, and `SameSite=None` is not allowed without it.
 */
export const rewriteCookie = (cookie: string, r: Route): string => {
  const [pair, ...attrs] = cookie.split(";");
  const kept = attrs
    .map((a) => a.trim())
    .filter((a) => a && !/^domain=/i.test(a))
    .filter((a) => r.secure || !/^secure$/i.test(a))
    .map((a) => (!r.secure && /^samesite=none$/i.test(a) ? "SameSite=Lax" : a));
  return [pair, ...kept].join("; ");
};

/** An absolute proxy URL mapped back to the upstream, or null if it was never ours. */
const rewriteReferer = (href: string, r: Route): string | null => {
  let from: URL;
  try {
    from = new URL(href);
  } catch {
    return null;
  }
  if (from.pathname !== r.prefix && !from.pathname.startsWith(`${r.prefix}/`)) return null;
  return toUpstream(r, from.pathname.slice(r.prefix.length) || "/", from.search).href;
};

const name = (pair: string) => {
  const eq = pair.indexOf("=");
  return eq === -1 ? pair : pair.slice(0, eq);
};

const dropped = (n: string, filters: readonly (string | RegExp)[]) =>
  filters.some((f) => (typeof f === "string" ? f === n : f.test(n)));
