import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { inject, once, open, override, resolver, scope } from "./route/inject.js";
import { Handler, Prefix, PrefixSpecs, Route, Spec, adapt, adapter, bind } from "./route/index.js";
import { bunRoute, bunRoutes } from "./adapter/bun.js";
import { elysiaRoute, elysiaRoutes } from "./adapter/elysia.js";
import { honoRoute, honoRoutes } from "./adapter/hono.js";
import { OpenApi, Scalar } from "./docs/index.js";
import { Router, compose, flatten, guard } from "./api/index.js";
//#region lib/api/src/http/index.ts
var http_exports = /* @__PURE__ */ __exportAll({
	Handler: () => Handler,
	OpenApi: () => OpenApi,
	Prefix: () => Prefix,
	PrefixSpecs: () => PrefixSpecs,
	Route: () => Route,
	Router: () => Router,
	Scalar: () => Scalar,
	Spec: () => Spec,
	adapt: () => adapt,
	adapter: () => adapter,
	bind: () => bind,
	bunRoute: () => bunRoute,
	bunRoutes: () => bunRoutes,
	compose: () => compose,
	elysiaRoute: () => elysiaRoute,
	elysiaRoutes: () => elysiaRoutes,
	flatten: () => flatten,
	guard: () => guard,
	honoRoute: () => honoRoute,
	honoRoutes: () => honoRoutes,
	inject: () => inject,
	once: () => once,
	open: () => open,
	override: () => override,
	resolver: () => resolver,
	scope: () => scope
});
//#endregion
export { Handler, OpenApi, Prefix, PrefixSpecs, Route, Router, Scalar, Spec, adapt, adapter, bind, bunRoute, bunRoutes, compose, elysiaRoute, elysiaRoutes, flatten, guard, honoRoute, honoRoutes, http_exports, inject, once, open, override, resolver, scope };

//# sourceMappingURL=index.js.map