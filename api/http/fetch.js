import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { validate } from "../core/schema.js";
import "../core/index.js";
import { assemble } from "./input.js";
import { HttpError } from "./error.js";
import { fail, ok } from "./respond.js";
//#region lib/api/src/http/fetch.ts
var fetch_exports = /* @__PURE__ */ __exportAll({
	handler: () => handler,
	router: () => router
});
/**
* Run a route, or report that it does not apply. Shared so "no match" and "matched, then
* failed" stay distinct: a router keeps looking in the first case and must not in the second.
*/
var attempt = async (route, request, framework) => {
	if (request.method !== route.method) return void 0;
	const matched = route.match(new URL(request.url).pathname);
	if (matched === void 0) return void 0;
	try {
		const input = await assemble(route, request, matched);
		const validated = await validate(input, route.node.in);
		if (!validated.ok) throw HttpError.fromIssues(validated.error);
		const handle = route.node.handle;
		if (!handle) throw new HttpError(`Route '${route.node.name}' has no handler`, { status: 501 });
		return ok(await handle(validated.value, await context(route, framework)));
	} catch (error) {
		return fail(error);
	}
};
/** `with` values first, then whatever `from` derives — or the argument itself when there is no `from`. */
var context = async (route, framework) => ({
	...route.context,
	...route.supply ? await route.supply(framework) : framework
});
/** One route as a standalone handler. Anything it does not match is a 404. */
var handler = (route) => (async (request, framework = {}) => await attempt(route, request, framework) ?? fail(HttpError.notFound()));
/**
* Several routes, tried in order. Their context requirements intersect, as `Api.group` does.
*
* @example
* ```ts
* const handler = Fetch.router(get, create) // (request, { db }) => Promise<Response>
* ```
*/
var router = (...routes) => (async (request, framework = {}) => {
	for (const route of routes) {
		const response = await attempt(route, request, framework);
		if (response !== void 0) return response;
	}
	return fail(HttpError.notFound());
});
//#endregion
export { fetch_exports, handler, router };

//# sourceMappingURL=fetch.js.map