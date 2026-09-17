//#region lib/api/src/http/route/inject.ts
var override = (provider, by) => [provider, by];
var scopes = /* @__PURE__ */ new WeakMap();
/** Start a fresh scope for a request. Routers call this; call it yourself only to apply overrides. */
var open = (req, overrides) => {
	const cache = /* @__PURE__ */ new Map();
	const get = (p) => {
		let v = cache.get(p);
		if (!v) {
			const impl = overrides?.get(p) ?? p;
			cache.set(p, v = (async () => impl(req, get))());
		}
		return v;
	};
	scopes.set(req, get);
	return get;
};
/** The request's scope, opened on first use. */
var scope = (req) => scopes.get(req) ?? open(req);
/** Resolve a provider for a request, e.g. from middleware. Shares the route's cache. */
var inject = (req, provider) => scope(req)(provider);
/** A provider built once for the process rather than per request. A failed build is retried. */
var once = (build) => {
	let v;
	return () => v ??= (async () => build())().catch((e) => {
		v = void 0;
		throw e;
	});
};
/** Resolve `inject` in parallel into an object keyed like it. */
var resolver = (inject) => {
	const keys = Object.keys(inject);
	const providers = Object.values(inject);
	return async (req) => {
		const get = scope(req);
		const values = await Promise.all(providers.map(get));
		const out = {};
		for (let i = 0; i < keys.length; i++) out[keys[i]] = values[i];
		return out;
	};
};
//#endregion
export { inject, once, open, override, resolver, scope };

//# sourceMappingURL=inject.js.map