const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_error = require("./error.cjs");
//#region lib/api/src/http/respond.ts
var respond_exports = /* @__PURE__ */ require_runtime.__exportAll({
	fail: () => fail,
	ok: () => ok
});
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
	if (!(error instanceof require_error.HttpError)) throw error;
	return Response.json(error.body, { status: error.status });
};
//#endregion
exports.fail = fail;
exports.ok = ok;
Object.defineProperty(exports, "respond_exports", {
	enumerable: true,
	get: function() {
		return respond_exports;
	}
});

//# sourceMappingURL=respond.cjs.map