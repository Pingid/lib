Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_schema = require("../core/schema.cjs");
require("../core/index.cjs");
const require_coerce = require("../core/coerce.cjs");
const require_error = require("./error.cjs");
const require_split = require("./split.cjs");
const require_assemble = require("./assemble.cjs");
const require_flatten = require("./flatten.cjs");
//#region lib/api/src/http/elysia.ts
/**
* One route as the three arguments elysia's `.get`/`.post`/… already take.
*
* Spread rather than wrapped: elysia builds its accumulated `Routes` type — which is what Eden
* Treaty reads — out of exactly those three argument types, so anything that changes the shape
* of the call has to reconstruct that accumulation by hand. A plugin to `.use()` would also
* force a runtime import of elysia into this module, and scope its context locally, which is
* the opposite of what per-route context needs.
*
* The return must stay a *tuple* type; declared as an array, every literal is lost at once.
*/
var elysia = (route) => {
	const node = route;
	const parts = require_split.split(node.node.in, node.bindings);
	const hooks = {};
	if (parts.params) hooks["params"] = parts.params;
	if (parts.query) hooks["query"] = parts.query;
	if (parts.headers) hooks["headers"] = parts.headers;
	if (parts.body) hooks["body"] = parts.body;
	if (node.node.out) hooks["response"] = { 200: node.node.out };
	hooks["transform"] = (ctx) => coerce(node, ctx);
	/** True when elysia was given nothing to validate — a standard schema, or a non-object root. */
	const ours = node.node.in !== void 0 && parts.params === void 0 && parts.query === void 0 && parts.headers === void 0 && parts.body === void 0;
	const handler = async (ctx) => {
		const request = ctx["request"];
		try {
			let input;
			if (ours && request) {
				input = await require_assemble.assemble(node, request);
				const validated = await require_schema.validate(input, node.node.in);
				if (!validated.ok) throw require_error.HttpError.fromIssues(validated.error);
				input = validated.value;
			} else input = require_flatten.flatten(node, {
				path: ctx["params"],
				query: ctx["query"],
				header: ctx["headers"],
				cookie: ctx["cookie"],
				body: ctx["body"]
			}, request);
			const handle = node.node.handle;
			if (!handle) throw new require_error.HttpError(`Route '${node.node.name}' has no handler`, { status: 501 });
			return await handle(input, await resolve(node, ctx));
		} catch (error) {
			if (!(error instanceof require_error.HttpError)) throw error;
			const set = ctx["set"];
			if (set) set.status = error.status;
			return error.body;
		}
	};
	return [
		route.path,
		handler,
		hooks
	];
};
/** Coerce in place: the parts are elysia's own objects, and it validates them next. */
var coerce = (route, ctx) => {
	const parts = {
		path: "params",
		query: "query",
		header: "headers",
		cookie: "cookie"
	};
	for (const [key, binding] of Object.entries(route.bindings)) {
		const slot = parts[binding.source];
		if (slot === void 0) continue;
		const part = ctx[slot];
		const raw = part?.[binding.name];
		if (raw === void 0) continue;
		const values = Array.isArray(raw) ? raw : [raw];
		if (!values.every((value) => typeof value === "string")) continue;
		part[binding.name] = require_coerce.tokens(route.fragment(key), values);
	}
};
var resolve = async (route, framework) => ({
	...route.context,
	...route.supply ? await route.supply(framework) : framework
});
//#endregion
exports.elysia = elysia;

//# sourceMappingURL=elysia.cjs.map