import { serve } from "./shared.js";
import { Elysia } from "elysia";
//#region lib/api/src/http/adapter/elysia.ts
/**
* Mount routes on an Elysia app, typed as if each went through `app.route`.
*
* Returns the app, so a group nests with `.use` or `.group`. Pass an app to set a prefix or decorators;
* without `context`, the app must provide every route's context.
*
* @example
* const app = new Elysia().decorate('db', db).use(elysiaRoutes([getItem], new Elysia({ prefix: '/api' })))
* treaty<typeof app>('localhost').api.items({ id: '1' }).get()
*/
var elysiaRoutes = (routes, app = new Elysia(), context) => {
	for (const rt of routes) app.route(...elysiaRoute(rt, context ?? ((ctx) => ctx)));
	return app;
};
/**
* A route as the arguments `app.route` takes, so method and path come from the spec.
*
* The route validates its own input, so Elysia gets no runtime schemas: the hook only carries types
* for Eden. Context defaults to the Elysia context, so a route needing `{ db }` only mounts on an app
* that decorates `db`. Pass `context` to derive it instead.
*
* @example
* const app = new Elysia().decorate('db', db).route(...elysiaRoute(getItem))
* treaty<typeof app>('localhost').items({ id: '1' }).get()
*/
var elysiaRoute = (rt, context = (ctx) => ctx) => {
	const run = serve(rt, context);
	const handler = (ctx) => run(ctx.request, {
		params: () => ctx.params,
		query: () => ctx.query,
		body: () => ctx.body,
		framework: ctx
	});
	return [
		(rt.schema.method ?? "GET").toLowerCase(),
		rt.schema.path,
		handler,
		{}
	];
};
//#endregion
export { elysiaRoute, elysiaRoutes };

//# sourceMappingURL=elysia.js.map