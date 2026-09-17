const require_cookie = require("./cookie.cjs");
const require_header = require("./header.cjs");
const require_error = require("./error.cjs");
const require_request = require("./request.cjs");
const require_upstream = require("./upstream.cjs");
const require_forward = require("./forward.cjs");
//#region lib/proxy/src/proxy.ts
/**
* Build a handler that forwards a request to one upstream and returns its
* response, rewritten.
*
* You match the path; this owns a single upstream. Bodies stream both ways —
* nothing is buffered — and redirects are passed through rather than followed,
* since the client is the one that has to see them.
*
* `context` carries what only the runtime knows: `clientIp` from
* `server.requestIP()` / `info.remoteAddr` / `socket.remoteAddress`, and
* `trustedPeer` when the immediate peer is a proxy you control. Without the
* latter, the client's own `X-Forwarded-*` are discarded rather than extended,
* because anyone can send them.
*/
var proxy = (target) => {
	const u = require_upstream.normalizeUpstream(target);
	const request = require_request.RequestPolicy.create().map((r, context) => ingress(r, context, u));
	if (u.request) request.use(u.request);
	const response = require_request.ResponsePolicy.create().headers(egress(u));
	if (u.response) response.use(u.response);
	return async (incoming, context = {}) => {
		const ctx = { ...context };
		ctx.clientTls ??= require_forward.isSecure(incoming, ctx);
		try {
			const upstream = await send(await request.applyTo(incoming, ctx), incoming, u);
			return await response.applyTo(upstream, ctx);
		} catch (error) {
			if (incoming.signal.aborted) throw error;
			if (u.onError) return await u.onError(error, incoming, ctx);
			if (error instanceof require_error.ProxyError) return error.response;
			throw error;
		}
	};
};
/**
* The request as the upstream should see it.
*
* `host` and `content-length` go because fetch derives both from the target and
* the body it actually sends. `referer` and `origin` go the other way: both
* describe the *proxy's* origin, which the upstream has never heard of, and an
* app that checks them for CSRF will reject every request until they match.
*/
var ingress = (request, context, u) => {
	const from = new URL(request.url);
	const trusted = context.trustedPeer === true;
	const headers = require_header.HeaderPolicy.create().excludeHopByHop().exclude("host", "content-length").when(!trusted, (p) => p.excludeTypes("FORWARDING")).forwarded(require_forward.forwardedInfo(request, context, u), { mode: trusted ? "append" : "replace" }).when(u.via != null, (p) => p.via(u.via)).mapHeader("referer", (value) => require_upstream.forwardUrl(u, value, from) ?? value).mapHeader("origin", () => u.origin).copyOf(request.headers, context);
	if (u.setHost) headers.set("host", u.host);
	const url = new URL(`${require_upstream.forwardPath(u, from.pathname)}${from.search}`, u.origin);
	return require_request.rebuildRequest(request, {
		url,
		headers
	});
};
/**
* The response as the client should see it.
*
* Hop-by-hop and transport headers go regardless of `rewriteBack`, because they
* describe a connection that has already ended: fetch has decoded the body on
* the way through, so forwarding the upstream's `Content-Encoding` would leave
* the client trying to gunzip plain bytes, and its `Content-Length` no longer
* counts what we are about to send. `Alt-Svc` would point the client at the
* upstream for the next request outright.
*
* `rewriteBack` covers the claims that name the upstream's *address*.
* `Location` names a path in the upstream's own space. The cookie `Domain`
* names a host the client cannot resolve, and would only get the cookie
* rejected. The cookie `Path` is the one with teeth: left at the upstream's
* `/`, the browser would hand that cookie to every *other* upstream mounted on
* this proxy, so it is re-rooted under the mount point instead.
*
* Security headers are deliberately left alone — an upstream's CSP or HSTS is
* its own to set, and `excludeTypes('SECURITY')` is there for callers who are
* embedding the upstream and need them gone.
*/
var egress = (u) => require_header.HeaderPolicy.create().excludeHopByHop().excludeTypes("TRANSFER").when(u.rewriteBack, (p) => p.mapUrls((value) => require_upstream.reverseUrl(u, value)).setCookies(require_cookie.SetCookiePolicy.create().domain(null).pathPrefix(u.basePath, u.stripPrefix).secureFor()));
/**
* Send it, and turn a transport failure into a status.
*
* A client that hangs up mid-flight is not a gateway failure — its `AbortError`
* is rethrown as-is so the runtime can drop the exchange quietly.
*
* `timeout` is a deadline on the *first byte*, not on the whole exchange: the
* timer is cleared once the response head arrives, so a long download or an open
* event stream is not cut off by a connect-timeout setting.
*/
var send = async (outgoing, incoming, u) => {
	const controller = new AbortController();
	let expired = false;
	const timer = u.timeout == null ? null : setTimeout(() => {
		expired = true;
		controller.abort();
	}, u.timeout);
	const target = timer == null ? outgoing : require_request.rebuildRequest(outgoing, { signal: AbortSignal.any([outgoing.signal, controller.signal]) });
	try {
		return await (u.fetch ?? globalThis.fetch)(target);
	} catch (cause) {
		if (incoming.signal.aborted) throw cause;
		if (expired) throw new require_error.ProxyError(504, `Gateway timeout: ${u.origin}`, { cause });
		throw new require_error.ProxyError(502, `Bad gateway: ${u.origin}`, { cause });
	} finally {
		if (timer != null) clearTimeout(timer);
	}
};
//#endregion
exports.proxy = proxy;

//# sourceMappingURL=proxy.cjs.map