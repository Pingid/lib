const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
let _sinclair_typebox = require("@sinclair/typebox");
//#region lib/api/src/http/split.ts
/**
* Splitting one flat input schema into the per-source objects a framework validates.
*
* @module
*/
var split_exports = /* @__PURE__ */ require_runtime.__exportAll({ of: () => of });
/**
* The flat input schema as one object per source, for adapters that validate ahead of the
* handler. Property schemas are reused by reference, so refinements and `OptionalKind` ride
* along. `Type.Pick` cannot do this: it keys by the *input* key where a framework needs the
* wire name, and drops the parent's `additionalProperties`.
*
* A standard schema yields nothing — approximating one as TypeBox would give the framework a
* validator that disagrees with the real one, so those routes validate once in `Schema.validate`.
*
* @example
* ```ts
* of(schema, route.bindings) // { params: TObject, query: TObject, headers: TObject }
* ```
*/
var of = (schema, bindings) => {
	if (schema === void 0 || !_sinclair_typebox.KindGuard.IsObject(schema)) return {};
	if (_sinclair_typebox.KindGuard.IsTransform(schema)) throw new Error("A transformed input schema cannot be split per source");
	const names = (source) => {
		const out = {};
		for (const [key, binding] of Object.entries(bindings)) if (binding.source === source) out[key] = binding.name;
		return out;
	};
	const loose = { additionalProperties: true };
	return {
		params: pick(schema, names("path")),
		query: pick(schema, names("query"), loose),
		headers: pick(schema, names("header"), loose),
		cookie: pick(schema, names("cookie"), loose),
		body: pick(schema, names("body"))
	};
};
var pick = (schema, names, options) => {
	const keys = Object.keys(names);
	if (keys.length === 0) return void 0;
	const properties = {};
	for (const key of keys) {
		const property = schema.properties[key];
		if (property !== void 0) properties[names[key]] = property;
	}
	return _sinclair_typebox.Type.Object(properties, options);
};
//#endregion
exports.of = of;
Object.defineProperty(exports, "split_exports", {
	enumerable: true,
	get: function() {
		return split_exports;
	}
});

//# sourceMappingURL=split.cjs.map