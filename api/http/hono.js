import { validate } from "../core/schema.js";
import "../core/index.js";
import { HttpError } from "./error.js";
import { assemble } from "./assemble.js";
import { HTTPException } from "hono/http-exception";
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
			const input = await assemble(node, request);
			const validated = await validate(input, node.node.in);
			if (!validated.ok) throw HttpError.fromIssues(validated.error);
			const handle = node.node.handle;
			if (!handle) throw new HttpError(`Route '${node.node.name}' has no handler`, { status: 501 });
			const context = {
				...node.context,
				...node.supply ? await node.supply(c) : c
			};
			return c["json"](await handle(validated.value, context));
		} catch (error) {
			if (!(error instanceof HttpError)) throw error;
			throw new HTTPException(error.status, { res: Response.json(error.body, { status: error.status }) });
		}
	});
};
//#endregion
export { hono };

//# sourceMappingURL=hono.js.map