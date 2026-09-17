import "./types.js";
import { contextFactory } from "./context/index.js";
//#region lib/api/src/http/route/index.ts
var Spec = (path, params) => ({
	path,
	...params
});
var Route = (schema, handler) => {
	const [spec, handle] = typeof schema === "string" ? [{
		...omit(handler, "handle"),
		path: schema
	}, handler.handle] : [schema, handler];
	const rt = {
		schema: spec,
		handler: handle
	};
	rt.fetch = adapt(rt).fetch;
	return rt;
};
var omit = (o, k) => {
	const { [k]: _, ...rest } = o;
	return rest;
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
		const c = ctx(rt.schema);
		return (req) => c(req).then(([ctx, context]) => rt.handler(ctx, context), (e) => e instanceof Response ? e : Promise.reject(e));
	};
};
//#endregion
export { Handler, Route, Spec, adapt, adapter };

//# sourceMappingURL=index.js.map