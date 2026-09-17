import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { Handler, Prefix, PrefixSpecs, Route, Spec, adapt, adapter } from "./route/index.js";
import { bunRoute, bunRoutes } from "./adapter/bun.js";
import { elysiaRoute, elysiaRoutes } from "./adapter/elysia.js";
import { honoRoute, honoRoutes } from "./adapter/hono.js";
import { OpenApi, Scalar } from "./docs/index.js";
//#region lib/api/src/http/index.ts
var http_exports = /* @__PURE__ */ __exportAll({
	Handler: () => Handler,
	OpenApi: () => OpenApi,
	Prefix: () => Prefix,
	PrefixSpecs: () => PrefixSpecs,
	Route: () => Route,
	Scalar: () => Scalar,
	Spec: () => Spec,
	adapt: () => adapt,
	adapter: () => adapter,
	bunRoute: () => bunRoute,
	bunRoutes: () => bunRoutes,
	elysiaRoute: () => elysiaRoute,
	elysiaRoutes: () => elysiaRoutes,
	honoRoute: () => honoRoute,
	honoRoutes: () => honoRoutes
});
//#endregion
export { Handler, OpenApi, Prefix, PrefixSpecs, Route, Scalar, Spec, adapt, adapter, bunRoute, bunRoutes, elysiaRoute, elysiaRoutes, honoRoute, honoRoutes, http_exports };

//# sourceMappingURL=index.js.map