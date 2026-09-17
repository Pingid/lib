import "./types.js";
import { contextFactory } from "./context/index.js";
//#region lib/api/src/http/route/index.ts
var Spec = (path, params) => ({
	path,
	...params
});
var Route = (schema, handler) => {
	const rt = {
		schema,
		handler
	};
	rt.fetch = adapt(rt).fetch;
	return rt;
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
		return (req) => c(req).then(rt.handler, (e) => e instanceof Response ? e : Promise.reject(e));
	};
};
//#endregion
export { Handler, Route, Spec, adapt, adapter };

//# sourceMappingURL=index.js.map