const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_schema = require("../core/schema.cjs");
require("../core/index.cjs");
const require_input = require("./input.cjs");
const require_error = require("./error.cjs");
const require_respond = require("./respond.cjs");
//#region lib/api/src/http/fetch.ts
var fetch_exports = /* @__PURE__ */ require_runtime.__exportAll({
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
		const input = await require_input.assemble(route, request, matched);
		const validated = await require_schema.validate(input, route.node.in);
		if (!validated.ok) throw require_error.HttpError.fromIssues(validated.error);
		const handle = route.node.handle;
		if (!handle) throw new require_error.HttpError(`Route '${route.node.name}' has no handler`, { status: 501 });
		return require_respond.ok(await handle(validated.value, await context(route, framework)));
	} catch (error) {
		return require_respond.fail(error);
	}
};
/** `with` values first, then whatever `from` derives — or the argument itself when there is no `from`. */
var context = async (route, framework) => ({
	...route.context,
	...route.supply ? await route.supply(framework) : framework
});
/** One route as a standalone handler. Anything it does not match is a 404. */
var handler = (route) => (async (request, framework = {}) => await attempt(route, request, framework) ?? require_respond.fail(require_error.HttpError.notFound()));
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
	return require_respond.fail(require_error.HttpError.notFound());
});
//#endregion
Object.defineProperty(exports, "fetch_exports", {
	enumerable: true,
	get: function() {
		return fetch_exports;
	}
});
exports.handler = handler;
exports.router = router;

//# sourceMappingURL=fetch.cjs.map