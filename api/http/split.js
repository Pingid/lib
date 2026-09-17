import { KindGuard, Type } from "@sinclair/typebox";
//#region lib/api/src/http/split.ts
/**
* The flat input schema as one object per source, for adapters that validate ahead of the
* handler.
*
* Property schemas are reused **by reference**, so `OptionalKind`, refinements and transforms
* ride along and `Type.Object` recomputes `required` from the markers. `Type.Pick` would be the
* obvious tool and cannot be used: it keys the result by the *input* key, while a framework
* needs the wire name (`x-request-id`, not `requestId`), and it drops the parent's
* `additionalProperties` — which is the wrong default in opposite directions for query and body.
*
* A standard schema yields nothing. Approximating one as TypeBox would hand the framework a
* validator that disagrees with the real one, so those routes validate once, in `Schema.validate`.
*/
var split = (schema, bindings) => {
	if (schema === void 0 || !KindGuard.IsObject(schema)) return {};
	if (KindGuard.IsTransform(schema)) throw new Error("A transformed input schema cannot be split per source");
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
	return Type.Object(properties, options);
};
//#endregion
export { split };

//# sourceMappingURL=split.js.map