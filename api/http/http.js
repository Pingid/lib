import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { Handler, Route, Spec, adapt, adapter } from "./route/index.js";
import { bunRoute, bunRoutes } from "./adapter/bun.js";
import { elysiaRoute, elysiaRoutes } from "./adapter/elysia.js";
import { honoRoute, honoRoutes } from "./adapter/hono.js";
//#region lib/api/src/http/http.ts
var http_exports = /* @__PURE__ */ __exportAll({
	Handler: () => Handler,
	Route: () => Route,
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
export { Handler, Route, Spec, adapt, adapter, bunRoute, bunRoutes, elysiaRoute, elysiaRoutes, honoRoute, honoRoutes, http_exports };

//# sourceMappingURL=http.js.map