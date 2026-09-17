import { serve } from "./shared.js";
//#region lib/api/src/http/adapter/elysia.ts
/**
* A route as the arguments `app.route` takes, so method and path come from the spec.
*
* The route validates its own input, so Elysia gets no runtime schemas: the hook only carries types
* for Eden. Context defaults to the Elysia context, so a route needing `{ db }` only mounts on an app
* that decorates `db`. Pass `context` to derive it instead.
*
* @example
* const app = new Elysia().decorate('db', db).route(...elysiaRoute(getContainer))
* treaty<typeof app>('localhost').containers({ id: '1' }).get()
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
export { elysiaRoute };

//# sourceMappingURL=elysia.js.map