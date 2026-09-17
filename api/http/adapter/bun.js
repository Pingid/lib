import { validate } from "../route/context/extract.js";
import { adapt } from "../route/index.js";
//#region lib/api/src/http/adapter/bun.ts
var bunRoutes = (routes) => {
	let r = {};
	for (const route of routes) {
		if (!route.spec.path) continue;
		if (!r[route.spec.path]) r[route.spec.path] = {};
		if (!r[route.spec.path][route.spec.method]) r[route.spec.path][route.spec.method] = bunRoute(route);
	}
	return r;
};
var bunRoute = (rt) => adapt(rt, { path: extractPath(rt) });
var extractPath = (rt) => {
	const schema = rt.spec.params;
	if (schema === void 0) return () => void 0;
	return async (req) => validate(schema, req.params);
};
//#endregion
export { bunRoute, bunRoutes };

//# sourceMappingURL=bun.js.map