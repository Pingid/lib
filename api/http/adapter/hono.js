import { serve } from "./shared.js";
//#region lib/api/src/http/adapter/hono.ts
/**
* A route as the arguments `app.on` takes, so method and path come from the spec.
*
* Context defaults to `c.var`; pass `context` to build it from the Hono context instead.
*
* @example
* const app = new Hono().on(...honoRoute(getContainer))
* hc<typeof app>('/').containers[':id'].$get({ param: { id: '1' } })
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
export { honoRoute };

//# sourceMappingURL=hono.js.map