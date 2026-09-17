const require_util = require("./util.cjs");
//#region lib/proxy/src/upstream.ts
function normalizeUpstream(target) {
	const config = typeof target === "string" || target instanceof URL ? { origin: target } : target;
	const url = new URL(config.origin);
	return {
		origin: url.origin,
		host: url.host,
		basePath: require_util.trimEnd(config.basePath ?? url.pathname),
		stripPrefix: require_util.trimEnd(config.stripPrefix ?? ""),
		rewriteBack: config.rewriteBack ?? true,
		setHost: config.setHost ?? false,
		timeout: config.timeout,
		request: config.request,
		response: config.response,
		via: config.via,
		onError: config.onError,
		fetch: config.fetch,
		source: target
	};
}
/** incoming path → upstream path */
function forwardPath(u, pathname) {
	const stripped = require_util.underPrefix(pathname, u.stripPrefix) ? pathname.slice(u.stripPrefix.length) || "/" : pathname;
	return `${u.basePath}${stripped}` || "/";
}
/** upstream path → incoming path (for Location, Content-Location, cookie Path) */
function reversePath(u, pathname) {
	const stripped = require_util.underPrefix(pathname, u.basePath) ? pathname.slice(u.basePath.length) || "/" : pathname;
	return `${u.stripPrefix}${stripped}` || "/";
}
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
function reverseUrl(u, value) {
	if (value === "" || value.startsWith("//")) return value;
	if (value.startsWith("/")) {
		const cut = value.search(/[?#]/);
		return cut === -1 ? reversePath(u, value) : `${reversePath(u, value.slice(0, cut))}${value.slice(cut)}`;
	}
	let url;
	try {
		url = new URL(value);
	} catch {
		return value;
	}
	if (url.origin !== u.origin) return value;
	return `${reversePath(u, url.pathname)}${url.search}${url.hash}`;
}
/**
* A proxy-facing absolute URL mapped onto the upstream, or null when it was
* never ours to rewrite. Used for `Referer`, which describes the *proxy's*
* origin — an address the upstream has never heard of.
*
* `from` is the incoming request's URL, and the host check against it is what
* keeps a referer from an unrelated site from being rewritten as though the
* client had come from us.
*/
function forwardUrl(u, value, from) {
	let url;
	try {
		url = new URL(value);
	} catch {
		return null;
	}
	if (url.host !== from.host) return null;
	if (u.stripPrefix !== "" && !require_util.underPrefix(url.pathname, u.stripPrefix)) return null;
	return new URL(`${forwardPath(u, url.pathname)}${url.search}`, u.origin).href;
}
//#endregion
exports.forwardPath = forwardPath;
exports.forwardUrl = forwardUrl;
exports.normalizeUpstream = normalizeUpstream;
exports.reversePath = reversePath;
exports.reverseUrl = reverseUrl;

//# sourceMappingURL=upstream.cjs.map