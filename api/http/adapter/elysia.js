import { is, toJson } from "../../core/schema.js";
import "../../core/index.js";
import { bodySchema } from "../route/context/extract.js";
import { byStatus } from "../route/response.js";
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
* The route validates its own input; Elysia gets its schemas for documentation only, so both frameworks
* validate the same way. Context defaults to the Elysia context, so a route needing `{ db }` only mounts on an app
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
		body: {
			json: () => ctx.body,
			binary: () => ctx.body
		},
		framework: ctx
	});
	return [
		(rt.schema.method ?? "GET").toLowerCase(),
		rt.schema.path,
		handler,
		hook(rt.schema)
	];
};
/** The route's schemas and metadata as Elysia hooks, for Elysia's docs. The route still does the validating. */
var hook = ({ params, query, body, response, summary, description, tags, operationId, deprecated }) => {
	const responses = Object.entries(byStatus(response)).flatMap(([status, p]) => {
		const schema = p?.["application/json"];
		return is(schema) ? [[status, doc(schema)]] : [];
	});
	const json = bodySchema(body);
	return defined({
		params: params && doc(params),
		query: query && doc(query),
		body: json && doc(json),
		response: responses.length ? Object.fromEntries(responses) : void 0,
		detail: defined({
			summary,
			description,
			tags,
			operationId,
			deprecated
		})
	});
};
/**
* A schema Elysia can document but never enforces. The route validates its own input, and a second pass
* over already-parsed values breaks transforms, e.g. a query `'true'` that became `true`. Documented as
* parsed, since a client is written against the values the route receives.
*/
var doc = (s) => {
	const json = (o) => toJson(s, "output", o?.target);
	return { "~standard": {
		version: 1,
		vendor: "lib-api",
		validate: (value) => ({ value }),
		jsonSchema: {
			input: json,
			output: json
		}
	} };
};
var defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
//#endregion
export { elysiaRoute, elysiaRoutes };

//# sourceMappingURL=elysia.js.map