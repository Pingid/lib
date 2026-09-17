const require_register = require("./register.cjs");
const require_api = require("./util/api.cjs");
require("./util/index.cjs");
//#region lib/api/src/core/build.ts
var op = (schema) => {
	const s = schema;
	s.in = s.in === void 0 ? object({}) : "~standard" in s.in ? s.in : object(s.in);
	s.out = s.out ?? empty();
	Object.defineProperty(s, "describe", {
		enumerable: false,
		value: (d) => (s.description = d, s)
	});
	Object.defineProperty(s, "meta", {
		enumerable: false,
		value: (k, ...args) => (require_register.update(s, { meta: { [k]: args } }), s)
	});
	return require_api.as(s);
};
var ns = (schema) => {
	const s = {
		...schema,
		operations: schema.operations.map((x) => require_api.as(x))
	};
	Object.defineProperty(s, "describe", {
		enumerable: false,
		value: (d) => (s.description = d, s)
	});
	Object.defineProperty(s, "meta", {
		enumerable: false,
		value: (k, ...args) => (require_register.update(s, { meta: { [k]: args } }), s)
	});
	return s;
};
var output = (o, returns) => {
	if (!o) return empty();
	if (returns) Object.defineProperty(o, "returns", { value: returns });
	return o;
};
var VENDOR = "@lickle/api-legacy";
var _type = (tt, json = tt) => {
	const t = tt;
	const js = (opts) => {
		const m = require_register.get(t);
		const out = { ...typeof json === "function" ? json(opts, m) : json };
		if (m.description !== void 0) out["description"] = m.description;
		if (m.default !== void 0) out["default"] = m.default;
		for (const k of Object.keys(out)) if (out[k] === void 0) delete out[k];
		return out;
	};
	Object.defineProperty(t, "~standard", {
		value: {
			version: 1,
			vendor: VENDOR,
			jsonSchema: {
				input: js,
				output: js
			}
		},
		enumerable: false
	});
	Object.defineProperty(t, "default", { value: (d) => (require_register.update(t, { default: d }), t) });
	Object.defineProperty(t, "describe", { value: (d) => (require_register.update(t, { description: d }), t) });
	Object.defineProperty(t, "meta", { value: (k, ...args) => (require_register.update(t, { meta: { [k]: args } }), t) });
	return t;
};
var empty = (d) => _type({
	type: "void",
	description: d
});
var number = (d) => _type({
	type: "number",
	description: d
});
var string = (d) => _type({
	type: "string",
	description: d
});
var boolean = (d) => _type({
	type: "boolean",
	description: d
});
var unknown = (d) => _type({
	type: "unknown",
	description: d
});
var any = (d) => _type({
	type: "any",
	description: d
});
var nul = (d) => _type({
	type: "null",
	description: d
});
var undef = (d) => _type({
	type: "undefined",
	description: d
});
var array = (p, description) => _type({
	type: "array",
	items: p,
	description
}, (opts) => ({
	type: "array",
	items: p["~standard"].jsonSchema.output(opts),
	description
}));
var set = (p, description) => _type({
	type: "enum",
	enum: p,
	description
}, {
	type: "string",
	enum: p,
	description
});
var union = (p, description) => _type({
	type: "union",
	oneOf: p,
	description
}, (opts) => ({
	oneOf: p.map((s) => s["~standard"].jsonSchema.output(opts)),
	description
}));
var object = (p, description) => _type({
	type: "object",
	properties: p,
	description
}, (opts) => {
	const properties = Object.entries(p).map(([k, v]) => [k, v["~standard"].jsonSchema.output(opts)]);
	return {
		type: "object",
		properties: Object.fromEntries(properties),
		required: properties.filter(([k, json]) => !p[k]?.optional && json["default"] === void 0).map(([k]) => k),
		description
	};
});
var optional = (t) => {
	Object.defineProperty(t, "optional", { value: true });
	return t;
};
var t = {
	void: empty(),
	empty,
	number,
	string,
	boolean,
	unknown,
	any,
	null: nul,
	undefined: undef,
	array,
	set,
	union,
	object,
	optional,
	output,
	op,
	ns
};
//#endregion
exports.any = any;
exports.array = array;
exports.boolean = boolean;
exports.empty = empty;
exports.ns = ns;
exports.nul = nul;
exports.number = number;
exports.object = object;
exports.op = op;
exports.optional = optional;
exports.output = output;
exports.set = set;
exports.string = string;
exports.t = t;
exports.undef = undef;
exports.union = union;
exports.unknown = unknown;

//# sourceMappingURL=build.cjs.map