import { validate } from "../route/context/extract.js";
import { adapt } from "../route/index.js";
//#region lib/api/src/http/adapter/bun.ts
var bunRoutes = (routes) => {
	let r = {};
	for (const route of routes) {
		if (!route.schema.path) continue;
		if (!r[route.schema.path]) r[route.schema.path] = {};
		if (!r[route.schema.path][route.schema.method]) r[route.schema.path][route.schema.method] = bunRoute(route);
	}
	return r;
};
var bunRoute = (rt) => adapt(rt, { path: extractPath(rt) });
var extractPath = (rt) => {
	const schema = rt.schema.params;
	if (schema === void 0) return () => void 0;
	return async (req) => validate(schema, req.params);
};
//#endregion
export { bunRoute, bunRoutes };

//# sourceMappingURL=bun.js.map