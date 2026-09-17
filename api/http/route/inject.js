//#region lib/api/src/http/route/inject.ts
/**
* Swap `provider` for `by` on every route below a router. `by` must produce the same type.
*
* @example
* const test = Router({ override: [override(user, () => ({ id: 'fake' }))], routes: [Update] })
*/
var override = (provider, by) => [provider, by];
var scopes = /* @__PURE__ */ new WeakMap();
/**
* Start a fresh scope for a request. Routers call this; call it yourself only to apply overrides.
*
* @example
* // a standalone route, with a fake user for this request only
* open(req, new Map([[user, () => ({ id: 'fake' })]]))
* await Update.fetch(req)
*/
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
/**
* Resolve a provider for a request, e.g. from middleware. Shares the route's cache.
*
* @example
* const signedIn = guard(async (req) => !!(await inject(req, session)))
*/
var inject = (req, provider) => scope(req)(provider);
/**
* A provider built once for the process rather than per request. A failed build is retried.
*
* @example
* const db = once(() => connect(process.env.DB_URL!))
* Route('/apps', { inject: { db }, handle: async (c, { db }) => c.json(await db.apps()) })
*/
var once = (build) => {
	let v;
	return () => v ??= (async () => build())().catch((e) => {
		v = void 0;
		throw e;
	});
};
/**
* A typed provider with no implementation, filled by an `override` on a router above the routes using it.
* Resolving one that was never filled throws, so a missing binding fails loudly rather than as `undefined`.
*
* @example
* const db = slot<Db>('db')
* Router({ override: [override(db, once(() => connect(env.DB_URL)))], routes })
*/
var slot = (name) => {
	const p = () => {
		throw new Error(`Provider slot '${name}' was not filled; bind it with override(${name}, ...)`);
	};
	Object.defineProperty(p, "name", { value: name });
	return p;
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
export { inject, once, open, override, resolver, scope, slot };

//# sourceMappingURL=inject.js.map