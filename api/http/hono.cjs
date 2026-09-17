Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_schema = require("../core/schema.cjs");
require("../core/index.cjs");
const require_error = require("./error.cjs");
const require_assemble = require("./assemble.cjs");
let hono_http_exception = require("hono/http-exception");
//#region lib/api/src/http/hono.ts
/**
* One route as a single Hono handler.
*
* Deliberately *not* a spread of `[validator, validator, handler]`. Hono's `.get` is an
* overload ladder — two handlers, three, four, then a variadic catch-all — that threads `I`,
* `I2`, `I3` so validator outputs accumulate into the `ToSchema` that `hc` reads. A spread
* type-checks, but if resolution falls through to the variadic rung the app still compiles and
* the route still serves while `hc` silently loses its typed request arguments. One handler
* with `I` declared keeps that inference in a single, stable position.
*
* No validator package either: `@hono/typebox-validator` is TypeBox-only and
* `@hono/standard-validator` is standard-schema-only, while `Schema` is both — and
* `Schema.validate`'s TypeBox path runs `Convert → Check → Decode`, so skipping it would
* change what the handler receives.
*/
var hono = (route) => {
	const node = route;
	return (async (c) => {
		const request = c["req"].raw;
		try {
			const input = await require_assemble.assemble(node, request);
			const validated = await require_schema.validate(input, node.node.in);
			if (!validated.ok) throw require_error.HttpError.fromIssues(validated.error);
			const handle = node.node.handle;
			if (!handle) throw new require_error.HttpError(`Route '${node.node.name}' has no handler`, { status: 501 });
			const context = {
				...node.context,
				...node.supply ? await node.supply(c) : c
			};
			return c["json"](await handle(validated.value, context));
		} catch (error) {
			if (!(error instanceof require_error.HttpError)) throw error;
			throw new hono_http_exception.HTTPException(error.status, { res: Response.json(error.body, { status: error.status }) });
		}
	});
};
//#endregion
exports.hono = hono;

//# sourceMappingURL=hono.cjs.map