import { readBody, validate } from "../route/context/extract.js";
import { adapter } from "../route/index.js";
//#region lib/api/src/http/adapter/shared.ts
/**
* Run a route against framework-parsed parts instead of re-reading the `Request`.
*
* Parts are keyed by request in a `WeakMap`, so the core still receives the framework's own `Request`
* untouched.
*/
var serve = (rt, context) => {
	const parts = /* @__PURE__ */ new WeakMap();
	const read = (k) => async (req, schema) => {
		const p = parts.get(req);
		return schema ? validate(schema, await p[k]()) : p[k]();
	};
	const run = adapter({
		path: read("params"),
		query: read("query"),
		body: (req, spec) => readBody(spec, req, parts.get(req).body),
		context: (req) => context(parts.get(req).framework)
	})(rt.spec);
	return (req, p) => (parts.set(req, p), run(req));
};
//#endregion
export { serve };

//# sourceMappingURL=shared.js.map