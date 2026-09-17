const require_util = require("./util.cjs");
const require_base = require("./base.cjs");
const require_cookie = require("./cookie.cjs");
//#region lib/proxy/src/header.ts
var HEADER_TYPE = {
	/** Connection-scoped, never forwarded. RFC 9110 §7.6.1. */
	HOP_BY_HOP: [
		"connection",
		"proxy-connection",
		"keep-alive",
		"proxy-authenticate",
		"proxy-authorization",
		"te",
		"trailer",
		"transfer-encoding",
		"upgrade"
	],
	SECURITY: [
		"x-frame-options",
		"content-security-policy",
		"content-security-policy-report-only",
		"strict-transport-security",
		"referrer-policy",
		"permissions-policy",
		"cross-origin-opener-policy",
		"cross-origin-embedder-policy",
		"cross-origin-resource-policy"
	],
	TRANSFER: [
		"alt-svc",
		"content-encoding",
		"content-length"
	],
	/** Client-supplied provenance claims. Strip on ingress unless the peer is trusted. */
	FORWARDING: [
		"forwarded",
		"x-forwarded-for",
		"x-forwarded-host",
		"x-forwarded-proto",
		"x-forwarded-port",
		"x-forwarded-prefix",
		"x-forwarded-server",
		"x-real-ip",
		"via"
	],
	CORS: [
		"access-control-allow-origin",
		"access-control-allow-credentials",
		"access-control-allow-headers",
		"access-control-allow-methods",
		"access-control-expose-headers",
		"access-control-max-age"
	],
	CACHE: [
		"cache-control",
		"pragma",
		"expires",
		"etag",
		"last-modified",
		"age",
		"vary"
	],
	CREDENTIALS: [
		"authorization",
		"cookie",
		"set-cookie"
	]
};
/** Split a comma-delimited field value, ignoring commas inside quoted strings. */
function splitList(value) {
	const out = [];
	let current = "";
	let quoted = false;
	let escaped = false;
	for (const ch of value) if (escaped) {
		current += ch;
		escaped = false;
	} else if (ch === "\\" && quoted) {
		current += ch;
		escaped = true;
	} else if (ch === "\"") {
		quoted = !quoted;
		current += ch;
	} else if (ch === "," && !quoted) {
		out.push(current);
		current = "";
	} else current += ch;
	out.push(current);
	return out.map((s) => s.trim()).filter(Boolean);
}
var HeaderPolicy = class HeaderPolicy extends require_base.BasePolicy {
	constructor() {
		super(require_base.compose.effects(), () => {});
	}
	static create() {
		return new HeaderPolicy();
	}
	/** Run the policy over a copy. The input is never mutated. */
	copyOf(headers, context = {}) {
		const next = new Headers(headers);
		this.mod(next, context);
		return next;
	}
	/**
	* Keep only headers for which the predicate returns true.
	*
	* The predicate sees `set-cookie` as one comma-joined value, because that is
	* what iterating a `Headers` gives you. Decide on the *name* here and reach
	* for `mapSetCookie` when the individual values matter.
	*/
	filter(predicate) {
		return this.step((headers) => {
			const drop = /* @__PURE__ */ new Set();
			headers.forEach((value, name) => {
				if (!predicate(name, value)) drop.add(name);
			});
			drop.forEach((name) => headers.delete(name));
		});
	}
	/** Remove headers whose name matches any pattern. Strings are case-insensitive. */
	exclude(...excludes) {
		const patterns = excludes.flat().map((p) => typeof p === "string" ? p.toLowerCase() : p);
		return this.filter((name) => !require_util.matchesAny(patterns, name));
	}
	/** Allowlist: drop everything whose name doesn't match. */
	keep(...keeps) {
		const patterns = keeps.flat().map((p) => typeof p === "string" ? p.toLowerCase() : p);
		return this.filter((name) => require_util.matchesAny(patterns, name));
	}
	excludeTypes(...types) {
		return this.exclude(types.flatMap((t) => HEADER_TYPE[t]));
	}
	set(name, value) {
		return this.step((headers) => headers.set(name, value));
	}
	/** Set only if the header is absent — useful for upstream defaults. */
	default(name, value) {
		return this.step((headers) => {
			if (!headers.has(name)) headers.set(name, value);
		});
	}
	append(name, value) {
		return this.step((headers) => headers.append(name, value));
	}
	rename(from, to) {
		return this.step((headers) => {
			const value = from.toLowerCase() === "set-cookie" ? headers.getSetCookie() : headers.get(from);
			if (value == null) return;
			headers.delete(from);
			if (Array.isArray(value)) for (const v of value) headers.append(to, v);
			else headers.set(to, value);
		});
	}
	/** Transform one header's value. Return null to remove it. */
	mapHeader(name, map) {
		return this.step((headers) => {
			const value = headers.get(name);
			if (value == null) return;
			const mapped = map(value);
			if (mapped == null) headers.delete(name);
			else headers.set(name, mapped);
		});
	}
	/**
	* Strip hop-by-hop headers, including the ones named by `Connection`
	* (RFC 9110 §7.6.1). Anything listed there is connection-scoped by
	* definition and must not be forwarded.
	*/
	excludeHopByHop() {
		return this.step((headers) => {
			const named = /* @__PURE__ */ new Set();
			for (const field of ["connection", "proxy-connection"]) {
				const value = headers.get(field);
				if (value == null) continue;
				for (const token of splitList(value)) named.add(token.toLowerCase());
			}
			named.delete("close");
			named.delete("host");
			for (const name of named) headers.delete(name);
			for (const name of HEADER_TYPE.HOP_BY_HOP) headers.delete(name);
		});
	}
	/**
	* Record the client in X-Forwarded-* (and optionally RFC 7239 `Forwarded`).
	* Defaults to replacing existing values, since a client can forge them.
	*/
	forwarded(info, options = {}) {
		const { mode = "replace", standard = false } = options;
		return this.step((headers) => {
			const chain = (name, value) => {
				const prior = mode === "append" ? headers.get(name) : null;
				headers.set(name, prior ? `${prior}, ${value}` : value);
			};
			const single = (name, value) => {
				if (mode === "replace" || !headers.has(name)) headers.set(name, value);
			};
			if (info.for != null) chain("x-forwarded-for", info.for);
			if (info.host != null) single("x-forwarded-host", info.host);
			if (info.proto != null) single("x-forwarded-proto", info.proto);
			if (info.port != null) single("x-forwarded-port", String(info.port));
			if (info.prefix != null) single("x-forwarded-prefix", info.prefix);
			if (standard) {
				const params = [];
				const node = (v) => v.includes(":") && !v.startsWith("[") ? `"[${v}]"` : v;
				if (info.by != null) params.push(`by=${node(info.by)}`);
				if (info.for != null) params.push(`for=${node(info.for)}`);
				if (info.host != null) params.push(`host=${info.host}`);
				if (info.proto != null) params.push(`proto=${info.proto}`);
				if (params.length) chain("forwarded", params.join(";"));
			}
		});
	}
	/** Append a `Via` entry, e.g. via('edge-1') → "1.1 edge-1". */
	via(pseudonym, protocol = "1.1") {
		return this.step((headers) => {
			const entry = `${protocol} ${pseudonym}`;
			const prior = headers.get("via");
			headers.set("via", prior ? `${prior}, ${entry}` : entry);
		});
	}
	/**
	* Rewrite URL-valued headers through `map`. Returning null drops the header.
	*
	* The mapping itself lives in `reverseUrl`, which knows the difference
	* between a reference that is ours and one that merely looks like it.
	*/
	mapUrls(map, names = ["location", "content-location"]) {
		return this.step((headers) => {
			for (const name of names) {
				const value = headers.get(name);
				if (value == null) continue;
				const next = map(value);
				if (next == null) headers.delete(name);
				else headers.set(name, next);
			}
		});
	}
	/** Transform the request `Cookie` header as a set. */
	mapCookie(map) {
		return this.step((headers) => {
			const raw = headers.get("cookie");
			if (raw == null) return;
			const mapped = map(require_cookie.CookieSet.parse(raw)).toString();
			if (mapped) headers.set("cookie", mapped);
			else headers.delete("cookie");
		});
	}
	/** Drop request cookies by name. */
	excludeCookies(...names) {
		const patterns = names.flat();
		return this.mapCookie((set) => set.filter((name) => !require_util.matchesAny(patterns, name)));
	}
	/** Run a composed `SetCookiePolicy` over every `Set-Cookie`. */
	setCookies(policy) {
		return this.mapSetCookie((cookie, context) => policy.applyTo(cookie, context));
	}
	excludeSetCookies(...names) {
		const patterns = names.flat();
		return this.mapSetCookie((cookie) => require_util.matchesAny(patterns, cookie.name) ? null : cookie);
	}
	/** The raw per-cookie escape hatch, for a transform too small to compose. Return null to drop that cookie. */
	mapSetCookie(map) {
		return this.step((headers, context) => {
			const raw = headers.getSetCookie();
			if (raw.length === 0) return;
			const mapped = raw.map((v) => map(require_cookie.SetCookie.parse(v), context)).filter((c) => c != null);
			headers.delete("set-cookie");
			for (const cookie of mapped) headers.append("set-cookie", cookie.toString());
		});
	}
};
//#endregion
exports.HEADER_TYPE = HEADER_TYPE;
exports.HeaderPolicy = HeaderPolicy;

//# sourceMappingURL=header.cjs.map