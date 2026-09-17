import "./types.js";
import { contextFactory } from "./context/index.js";
import { inject, once, open, override, resolver, scope } from "./inject.js";
//#region lib/api/src/http/route/index.ts
var Spec = (path, params) => ({
	path,
	...params
});
var Route = (schema, handler) => {
	if (typeof schema !== "string") return make(schema, handler);
	const { handle, inject, ...spec } = handler;
	return make({
		...spec,
		path: schema
	}, inject ? bind(inject, handle) : handle, inject);
};
var make = (spec, handler, inject) => {
	const rt = {
		spec,
		handler,
		...inject && { inject }
	};
	rt.fetch = adapt(rt).fetch;
	return rt;
};
/**
* A handler that receives its injected values, as a handler that does not. The route's context type then
* only names what the host must supply, so adapters mount it unchanged.
*/
var bind = (inject, handle) => {
	const resolve = resolver(inject);
	return async (ctx, context) => handle(ctx, Object.assign({}, context, await resolve(ctx.request)));
};
var Handler = (handler) => handler;
/** Create a route request handler for a route */
var adapt = (rt, e = {}) => ({
	...rt,
	fetch: adapter(e)(rt)
});
var adapter = (e) => {
	const ctx = contextFactory(e);
	return (rt) => {
		const c = ctx(rt.spec);
		return (req) => c(req).then(([ctx, context]) => rt.handler(ctx, context), (e) => e instanceof Response ? e : Promise.reject(e));
	};
};
var PrefixSpecs = (prefix, ...routes) => routes.map((r) => ({
	...r,
	path: prefix + r.path
}));
var Prefix = (prefix, ...routes) => routes.map((r) => ({
	...r,
	schema: {
		...r.spec,
		path: prefix + r.spec.path
	}
}));
//#endregion
export { Handler, Prefix, PrefixSpecs, Route, Spec, adapt, adapter, bind, inject, once, open, override, resolver, scope };

//# sourceMappingURL=index.js.map