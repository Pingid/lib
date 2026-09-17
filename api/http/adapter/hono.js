import { serve } from "./shared.js";
import { Hono } from "hono";
//#region lib/api/src/http/adapter/hono.ts
/**
* Mount routes on a Hono app, typed as if each went through `app.on`.
*
* Returns the app, so a group nests like any sub-app. Pass an app to add middleware, an env or a base path.
*
* @example
* const items = honoRoutes([getItem, createItem])
* const app = new Hono().route('/api', items)
* hc<typeof app>('/').api.items[':id'].$get({ param: { id: '1' } })
*/
var honoRoutes = (routes, app = new Hono(), context) => {
	for (const rt of routes) app.on(...honoRoute(rt, context));
	return app;
};
/**
* A route as the arguments `app.on` takes, so method and path come from the spec.
*
* Context defaults to `c.var`; pass `context` to build it from the Hono context instead.
*
* @example
* const app = new Hono().on(...honoRoute(getItem))
* hc<typeof app>('/').items[':id'].$get({ param: { id: '1' } })
*/
var honoRoute = (rt, context = (c) => c.var) => {
	const run = serve(rt, context);
	const handler = (c) => run(c.req.raw, {
		params: () => c.req.param(),
		query: () => c.req.query(),
		body: () => c.req.json(),
		framework: c
	});
	return [
		rt.schema.method ?? "GET",
		rt.schema.path,
		handler
	];
};
//#endregion
export { honoRoute, honoRoutes };

//# sourceMappingURL=hono.js.map