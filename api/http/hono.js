import { validate } from "../core/schema.js";
import "../core/index.js";
import { assemble } from "./input.js";
import { HttpError } from "./error.js";
import { HTTPException } from "hono/http-exception";
//#region lib/api/src/http/hono.ts
/**
* One route as a single Hono handler.
*
* Deliberately not a spread of `[validator, validator, handler]`: `.get` is an overload ladder
* ending in a variadic rung, and falling through to it still compiles and still serves while
* `hc` silently loses its typed request arguments. One handler keeps that inference in one
* stable position. No validator package either — each covers only half of `Schema.Type`, and
* skipping `Schema.validate`'s `Convert → Check → Decode` would change what the handler gets.
*
* @example
* ```ts
* import { Hono as HonoApp } from 'hono'
* import * as Hono from '@pingid/lib-api/http/hono'
*
* const app = new HonoApp().get('/orgs/:org', Hono.route(get))
* hc<typeof app>('/').orgs[':org'].$get({ param: { org: 'a' }, query: { page: 2 } })
* ```
*/
var route = (route) => {
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
export { route };

//# sourceMappingURL=hono.js.map