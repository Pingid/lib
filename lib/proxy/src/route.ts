/** Anything that names an upstream: `"http://app:3000"`, `"http://app:3000/base"`, a `URL`. */
export type Upstream = string | URL;

/**
 * One mounted upstream, from the proxy's point of view.
 *
 * Everything else in the library is a pure function of a request and one of
 * these, so a route is the only thing a caller has to produce — however it
 * likes: a static table, a service registry, a container inspection.
 */
export type Route = {
  /** Inbound mount path, no trailing slash, e.g. `/proxy/web`. */
  prefix: string;
  /** Upstream base. A path here roots the upstream under a sub-path. */
  upstream: URL;
  /** Whether the *client* reached the proxy over TLS. Drives cookie and `x-forwarded-proto` handling. */
  secure: boolean;
};

export const route = (prefix: string, upstream: Upstream, secure = false): Route => ({
  prefix: prefix.replace(/\/+$/, ""),
  upstream: url(upstream),
  secure,
});

export const url = (u: Upstream) => (u instanceof URL ? u : new URL(u));

/** Did the client's leg of the connection use TLS? Trusts `x-forwarded-proto` if a proxy set one. */
export const isSecure = (request: Request) =>
  request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https" ||
  new URL(request.url).protocol === "https:";

/**
 * Inbound path (prefix already stripped) to the URL to actually fetch.
 *
 * Assigning through `URL.pathname` normalises away `..`, so a client cannot
 * climb out of the upstream's base path.
 */
export const toUpstream = (r: Route, path: string, search = ""): URL => {
  const target = new URL(r.upstream);
  target.pathname = base(r) + (path.startsWith("/") ? path : "/" + path);
  target.search = search;
  return target;
};

/** The inverse: an upstream pathname mapped back under the proxy's prefix. */
export const toProxy = (r: Route, pathname: string): string => {
  const root = base(r);
  if (root && (pathname === root || pathname.startsWith(root + "/")))
    pathname = pathname.slice(root.length);
  return r.prefix + (pathname || "/");
};

/** Strip `route.prefix` off a pathname. Returns `/` when nothing is left. */
export const strip = (r: Route, pathname: string): string =>
  pathname.startsWith(r.prefix) ? pathname.slice(r.prefix.length) || "/" : pathname;

const base = (r: Route) => r.upstream.pathname.replace(/\/+$/, "");
