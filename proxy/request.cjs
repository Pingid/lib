const require_base = require("./base.cjs");
const require_header = require("./header.cjs");
const require_error = require("./error.cjs");
const require_upstream = require("./upstream.cjs");
//#region lib/proxy/src/request.ts
var RequestPolicy = class RequestPolicy extends require_base.BasePolicy {
	constructor() {
		super(require_base.compose.asyncPipe(), async (request) => request);
	}
	static create() {
		return new RequestPolicy();
	}
	/** Run a HeaderPolicy over a mutable copy and rebuild. */
	headers(policy) {
		return this.step(async (request, context) => rebuildRequest(request, { headers: policy.copyOf(request.headers, context) }));
	}
	/** Arbitrary per-request transform — the escape hatch the other methods are sugar for. */
	map(fn) {
		return this.step(async (request, context) => fn(request, context));
	}
	url(map) {
		return this.step(async (request) => {
			return rebuildRequest(request, { url: await map(new URL(request.url), request) });
		});
	}
	method(map) {
		return this.step(async (request) => rebuildRequest(request, { method: map(request.method) }));
	}
	/**
	* Point the request at an upstream origin. A path on `target` is prepended;
	* `stripPrefix` removes a local mount point first.
	*/
	upstream(target) {
		const resolved = require_upstream.normalizeUpstream(target);
		return this.step(async (request) => applyUpstream(request, resolved));
	}
	/**
	* Strip client-supplied provenance and record the real client.
	* Only extends an existing chain when the peer is trusted.
	*/
	forwarded(resolve, options = {}) {
		return this.step(async (request, context) => {
			const trusted = context.trustedPeer === true;
			return rebuildRequest(request, { headers: require_header.HeaderPolicy.create().when(!trusted, (p) => p.excludeTypes("FORWARDING")).forwarded(resolve(request, context), {
				mode: trusted ? "append" : "replace",
				standard: options.standard
			}).when(options.via != null, (p) => p.via(options.via)).copyOf(request.headers, context) });
		});
	}
	/**
	* Abort the upstream call after `ms`, without detaching from client cancellation.
	*
	* This is a deadline on the whole exchange, body included — a timeout signal
	* cannot be cleared once started — so it will cut off a long download or an
	* open event stream. It produces a plain abort, not a 504; for a
	* time-to-first-byte deadline that answers with one, set `timeout` on the
	* upstream instead.
	*/
	timeout(ms) {
		return this.step(async (request) => rebuildRequest(request, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(ms)]) }));
	}
	/** Read-only proxy: turn writes into a rejection you can catch upstream. */
	readOnly(allowed = [
		"GET",
		"HEAD",
		"OPTIONS"
	]) {
		const set = new Set(allowed.map((m) => m.toUpperCase()));
		return this.step(async (request) => {
			if (!set.has(request.method.toUpperCase())) throw new require_error.ProxyError(405, `Method ${request.method} not allowed`);
			return request;
		});
	}
	/** Inspect without modifying — logging, metrics, auth checks that throw. */
	inspect(fn) {
		return this.step(async (request, context) => {
			await fn(request, context);
			return request;
		});
	}
};
var ResponsePolicy = class ResponsePolicy extends require_base.BasePolicy {
	constructor() {
		super(require_base.compose.asyncPipe(), async (response) => response);
	}
	static create() {
		return new ResponsePolicy();
	}
	headers(policy) {
		return this.step(async (response, context) => rebuildResponse(response, { headers: policy.copyOf(response.headers, context) }));
	}
	/** Arbitrary per-response transform — the escape hatch the other methods are sugar for. */
	map(fn) {
		return this.step(async (response, context) => fn(response, context));
	}
	status(map) {
		return this.step(async (response) => rebuildResponse(response, { status: map(response.status, response) }));
	}
	/** Replace the body when a predicate matches — error pages, upstream leak masking. */
	replaceWhen(predicate, build) {
		return this.step(async (response) => predicate(response) ? build(response) : response);
	}
	/** Hide upstream 5xx detail from clients while keeping the status. */
	maskServerErrors(body = "Upstream error") {
		return this.replaceWhen((response) => response.status >= 500, (response) => {
			response.body?.cancel();
			return new Response(body, {
				status: 502,
				headers: { "content-type": "text/plain" }
			});
		});
	}
	/** Inspect without modifying — logging, metrics, anything that only reads. */
	inspect(fn) {
		return this.step(async (response, context) => {
			await fn(response, context);
			return response;
		});
	}
};
var BODYLESS_METHODS = /* @__PURE__ */ new Set(["GET", "HEAD"]);
var NULL_BODY_STATUS = /* @__PURE__ */ new Set([
	204,
	205,
	304
]);
function rebuildRequest(request, patch = {}) {
	const method = (patch.method ?? request.method).toUpperCase();
	const body = BODYLESS_METHODS.has(method) ? null : patch.body !== void 0 ? patch.body : request.body;
	const init = {
		method,
		headers: patch.headers ?? request.headers,
		body,
		redirect: "manual",
		signal: patch.signal ?? request.signal
	};
	if (body != null && typeof body.getReader === "function") init.duplex = "half";
	return new Request(patch.url ?? request.url, init);
}
function rebuildResponse(response, patch = {}) {
	const status = patch.status ?? response.status;
	const forced = NULL_BODY_STATUS.has(status);
	if (forced) response.body?.cancel();
	const body = forced ? null : patch.body !== void 0 ? patch.body : response.body;
	return new Response(body, {
		status,
		statusText: patch.statusText ?? response.statusText,
		headers: patch.headers ?? response.headers
	});
}
function applyUpstream(request, u) {
	const url = new URL(request.url);
	const next = new URL(`${require_upstream.forwardPath(u, url.pathname)}${url.search}`, u.origin);
	const headers = u.setHost ? new Headers(request.headers) : request.headers;
	if (u.setHost) headers.set("host", u.host);
	return rebuildRequest(request, {
		url: next,
		headers
	});
}
//#endregion
exports.RequestPolicy = RequestPolicy;
exports.ResponsePolicy = ResponsePolicy;
exports.applyUpstream = applyUpstream;
exports.rebuildRequest = rebuildRequest;
exports.rebuildResponse = rebuildResponse;

//# sourceMappingURL=request.cjs.map