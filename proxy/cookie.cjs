const require_util = require("./util.cjs");
const require_base = require("./base.cjs");
//#region lib/proxy/src/cookie.ts
var SetCookiePolicy = class SetCookiePolicy extends require_base.BasePolicy {
	constructor() {
		super(require_base.compose.nullablePipe(), (cookie) => cookie);
	}
	static create() {
		return new SetCookiePolicy();
	}
	/** Drop cookies matching the predicate. */
	drop(predicate) {
		return this.step((cookie) => predicate(cookie) ? null : cookie);
	}
	excludeNames(...names) {
		const patterns = names.flat();
		return this.drop((cookie) => require_util.matchesAny(patterns, cookie.name));
	}
	/** Retarget at the proxy's domain. `null` clears Domain, scoping to the host. */
	domain(to, from) {
		return this.step((cookie) => {
			const current = cookie.domain;
			if (current == null) return cookie;
			if (from != null) {
				const bare = current.replace(/^\./, "");
				if (!(typeof from === "string" ? bare === from.replace(/^\./, "") : from.test(bare))) return cookie;
			}
			cookie.domain = to;
			return cookie;
		});
	}
	/**
	* Re-prefix an explicit `Path` for an upstream mounted under a subpath.
	*
	* A cookie with no `Path` at all is left alone. The browser already defaults
	* it to the directory of the response that set it — which the client fetched
	* from the proxy, so it is already right — and writing one in would only
	* narrow the cookie to a path the client may never visit.
	*/
	pathPrefix(from, to) {
		const base = require_util.trimEnd(from);
		const target = require_util.trimEnd(to);
		return this.step((cookie) => {
			const path = cookie.path;
			if (path == null) return cookie;
			if (base === "" || require_util.underPrefix(path, base)) cookie.path = require_util.trimEnd(`${target}${path.slice(base.length)}`) || "/";
			return cookie;
		});
	}
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
	secureFor(tls) {
		return this.step((cookie, context) => {
			if (tls ?? context.clientTls === true) return cookie;
			cookie.secure = false;
			if (cookie.sameSite?.toLowerCase() === "none") cookie.sameSite = "Lax";
			return cookie;
		});
	}
	/** Arbitrary per-cookie transform. Return null to drop the cookie. */
	map(fn) {
		return this.step(fn);
	}
	harden(options = {}) {
		const { secure = true, httpOnly, sameSite, partitioned, maxAge } = options;
		return this.step((cookie) => {
			if (sameSite) cookie.sameSite = sameSite;
			if (secure || sameSite === "None") cookie.secure = true;
			if (httpOnly) cookie.httpOnly = true;
			if (partitioned) cookie.set("Partitioned", true);
			if (maxAge != null) {
				cookie.set("Max-Age", String(maxAge));
				cookie.remove("Expires");
			}
			return cookie;
		});
	}
	/** Cap cookie lifetime without extending short-lived ones. */
	capMaxAge(seconds) {
		return this.step((cookie) => {
			const current = cookie.get("max-age");
			const parsed = typeof current === "string" ? Number(current) : NaN;
			if (!Number.isFinite(parsed) || parsed > seconds) cookie.set("Max-Age", String(seconds));
			return cookie;
		});
	}
	rename(from, to) {
		return this.step((cookie) => {
			if (cookie.name === from) cookie.name = to;
			return cookie;
		});
	}
	prefixNames(prefix) {
		return this.step((cookie) => {
			cookie.name = `${prefix}${cookie.name}`;
			return cookie;
		});
	}
};
/** The request `Cookie` header: an ordered list of name=value pairs. */
var CookieSet = class CookieSet {
	pairs;
	constructor(pairs) {
		this.pairs = pairs;
	}
	static parse(header) {
		const pairs = header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
			const eq = part.indexOf("=");
			return eq === -1 ? {
				name: part,
				value: ""
			} : {
				name: part.slice(0, eq).trim(),
				value: part.slice(eq + 1).trim()
			};
		});
		return new CookieSet(pairs);
	}
	get(name) {
		return this.pairs.find((p) => p.name === name)?.value;
	}
	has(name) {
		return this.pairs.some((p) => p.name === name);
	}
	set(name, value) {
		const existing = this.pairs.find((p) => p.name === name);
		if (existing) existing.value = value;
		else this.pairs.push({
			name,
			value
		});
		return this;
	}
	/** Keep only cookies for which the predicate returns true. */
	filter(predicate) {
		this.pairs = this.pairs.filter((p) => predicate(p.name, p.value));
		return this;
	}
	exclude(...names) {
		const patterns = names.flat();
		return this.filter((name) => !require_util.matchesAny(patterns, name));
	}
	keep(...names) {
		const patterns = names.flat();
		return this.filter((name) => require_util.matchesAny(patterns, name));
	}
	rename(from, to) {
		for (const p of this.pairs) if (p.name === from) p.name = to;
		return this;
	}
	get size() {
		return this.pairs.length;
	}
	toString() {
		return this.pairs.map((p) => p.value ? `${p.name}=${p.value}` : p.name).join("; ");
	}
};
var ATTRIBUTE_CASE = {
	expires: "Expires",
	"max-age": "Max-Age",
	domain: "Domain",
	path: "Path",
	secure: "Secure",
	httponly: "HttpOnly",
	samesite: "SameSite",
	partitioned: "Partitioned",
	priority: "Priority"
};
/** A single `Set-Cookie` value: name, value and its attributes. */
var SetCookie = class SetCookie {
	name;
	value;
	attrs = /* @__PURE__ */ new Map();
	constructor(name, value) {
		this.name = name;
		this.value = value;
	}
	/** A fresh cookie with no attributes. `parse` covers the other direction. */
	static of(name, value) {
		return new SetCookie(name, value);
	}
	static parse(raw) {
		const [pair = "", ...rest] = raw.split(";");
		const eq = pair.indexOf("=");
		const cookie = eq === -1 ? new SetCookie(pair.trim(), "") : new SetCookie(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
		for (const part of rest) {
			const trimmed = part.trim();
			if (!trimmed) continue;
			const i = trimmed.indexOf("=");
			const key = (i === -1 ? trimmed : trimmed.slice(0, i)).trim();
			const value = i === -1 ? true : trimmed.slice(i + 1).trim();
			cookie.attrs.set(key.toLowerCase(), {
				key: ATTRIBUTE_CASE[key.toLowerCase()] ?? key,
				value
			});
		}
		return cookie;
	}
	get(attribute) {
		return this.attrs.get(attribute.toLowerCase())?.value;
	}
	set(attribute, value) {
		const lower = attribute.toLowerCase();
		this.attrs.set(lower, {
			key: ATTRIBUTE_CASE[lower] ?? attribute,
			value
		});
		return this;
	}
	remove(attribute) {
		this.attrs.delete(attribute.toLowerCase());
		return this;
	}
	flag(name, on) {
		if (on) this.set(name, true);
		else this.remove(name);
	}
	get domain() {
		const v = this.get("domain");
		return typeof v === "string" ? v : void 0;
	}
	set domain(v) {
		if (v == null) this.remove("domain");
		else this.set("domain", v);
	}
	get path() {
		const v = this.get("path");
		return typeof v === "string" ? v : void 0;
	}
	set path(v) {
		if (v == null) this.remove("path");
		else this.set("path", v);
	}
	get sameSite() {
		const v = this.get("samesite");
		return typeof v === "string" ? v : void 0;
	}
	set sameSite(v) {
		if (v == null) this.remove("samesite");
		else this.set("samesite", v);
	}
	get secure() {
		return this.attrs.has("secure");
	}
	set secure(on) {
		this.flag("Secure", on);
	}
	get httpOnly() {
		return this.attrs.has("httponly");
	}
	set httpOnly(on) {
		this.flag("HttpOnly", on);
	}
	toString() {
		const parts = [`${this.name}=${this.value}`];
		for (const { key, value } of this.attrs.values()) parts.push(value === true ? key : `${key}=${value}`);
		return parts.join("; ");
	}
};
//#endregion
exports.CookieSet = CookieSet;
exports.SetCookie = SetCookie;
exports.SetCookiePolicy = SetCookiePolicy;

//# sourceMappingURL=cookie.cjs.map