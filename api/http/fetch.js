import { validate } from "../core/schema.js";
import "../core/index.js";
import { HttpError } from "./error.js";
import { assemble } from "./assemble.js";
import { fail, ok } from "./respond.js";
//#region lib/api/src/http/fetch.ts
/**
* Run a route, or report that it does not apply.
*
* Shared by `toFetch` and `router` so that "no match" and "matched, then failed" stay distinct:
* a router has to keep looking in the first case and must not in the second.
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
var toFetch = (route) => (async (request, framework = {}) => await attempt(route, request, framework) ?? fail(HttpError.notFound()));
/** Several routes, tried in order. Their context requirements intersect, as `Api.group` does. */
var router = (...routes) => (async (request, framework = {}) => {
	for (const route of routes) {
		const response = await attempt(route, request, framework);
		if (response !== void 0) return response;
	}
	return fail(HttpError.notFound());
});
//#endregion
export { router, toFetch };

//# sourceMappingURL=fetch.js.map