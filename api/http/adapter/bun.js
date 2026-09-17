import { validate } from "../route/context/extract.js";
import { adapt as adapt$1 } from "../route/index.js";
//#region lib/api/src/http/adapter/bun.ts
var routes = (routes) => {
	let r = {};
	for (const route of routes) {
		if (!route.schema.path) continue;
		if (!r[route.schema.path]) r[route.schema.path] = {};
		if (!r[route.schema.path][route.schema.method]) r[route.schema.path][route.schema.method] = adapt(route);
	}
	return r;
};
var adapt = (rt) => adapt$1(rt, { path: extractPath(rt) });
var extractPath = (rt) => {
	const schema = rt.schema.params;
	if (schema === void 0) return () => void 0;
	return async (req) => validate(schema, req.params);
};
//#endregion
export { adapt, routes };

//# sourceMappingURL=bun.js.map