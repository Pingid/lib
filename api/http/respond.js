import { HttpError } from "./error.js";
//#region lib/api/src/http/respond.ts
/**
* The one place the three adapters agree on what a response looks like.
*
* `undefined` is 204 rather than the string "undefined", and a `Response` a handler built
* itself is passed straight through — the escape hatch for streaming and redirects.
*/
var ok = (value) => {
	if (value instanceof Response) return value;
	if (value === void 0) return new Response(null, { status: 204 });
	return Response.json(value);
};
/** A `HttpError` becomes its response; anything else is a bug and propagates untouched. */
var fail = (error) => {
	if (!(error instanceof HttpError)) throw error;
	return Response.json(error.body, { status: error.status });
};
//#endregion
export { fail, ok };

//# sourceMappingURL=respond.js.map