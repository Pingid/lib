const require_cmd = require("./cmd.cjs");
let _sinclair_typebox = require("@sinclair/typebox");
//#region lib/api/src/cli/macro.ts
var field = (type, options) => ({
	...typeof options === "string" ? { description: options } : options,
	type
});
var str = (options) => field(_sinclair_typebox.Type.String(), options);
var num = (options) => field(_sinclair_typebox.Type.Number(), options);
var int = (options) => field(_sinclair_typebox.Type.Integer(), options);
var bool = (options) => field(_sinclair_typebox.Type.Boolean(), options);
var of = (first, second) => {
	const inline = Array.isArray(first);
	const values = inline ? first : first.enum;
	const { enum: _, ...rest } = inline ? typeof second === "string" ? { description: second } : second ?? {} : first;
	const literals = values.map((value) => _sinclair_typebox.Type.Literal(value));
	return field(literals.length === 1 ? literals[0] : _sinclair_typebox.Type.Union(literals), rest);
};
var list = (first, second) => {
	const declared = isValue(first);
	const items = declared ? toSchema(first) : _sinclair_typebox.Type.String();
	return field(_sinclair_typebox.Type.Array(items), declared ? second : first);
};
/**
* Build a command from a record of declarations. The args are assembled into a
* `Type.Object` and handed to `Cmd.in`, so TypeBox refinements (`minLength`, ranges)
* are validated, and aliases and descriptions carry through to help.
*/
var cmd = (def) => {
	const properties = {};
	const positional = [];
	const sources = {};
	for (const [key, value] of Object.entries(def.options ?? {})) {
		const schema = toSchema(value);
		properties[key] = present(value, schema) ? schema : _sinclair_typebox.Type.Optional(schema);
		if (value.positional) positional.push(key);
		const source = value.complete;
		if (source !== void 0) sources[key] = source;
	}
	const command = require_cmd.Cmd.build(def.name).in(_sinclair_typebox.Type.Object(properties));
	if (Object.keys(sources).length > 0) command.complete(sources);
	if (def.description) command.describe(def.description);
	if (def.usage) command.use(def.usage);
	const order = "positionals" in def ? def.positionals ?? positional : positional;
	if (order.length > 0) command.positional([...order]);
	if ("handle" in def) command.handle(def.handle);
	if ("commands" in def) command.with(...Object.values(def.commands ?? {}));
	return command;
};
var macro_default = {
	cmd,
	str,
	num,
	int,
	bool,
	list,
	enum: of
};
/** Options never carry a `type`, so its presence is what separates a value from options. */
var isValue = (value) => typeof value === "object" && value !== null && (_sinclair_typebox.KindGuard.IsSchema(value) || "type" in value);
var toSchema = (value) => {
	if (_sinclair_typebox.KindGuard.IsSchema(value)) return value;
	const { type, required, positional, complete, ...rest } = value;
	if (_sinclair_typebox.KindGuard.IsSchema(type)) return {
		...type,
		...rest
	};
	return fromJson(value);
};
/** The literal shorthand to a TypeBox schema, so one path runs the validation. */
var fromJson = (json) => {
	const { type, items, enum: values, required, positional, complete, ...options } = json;
	if (values) {
		const literals = values.map((value) => _sinclair_typebox.Type.Literal(value));
		if (literals.length === 1) return {
			...literals[0],
			...options
		};
		return _sinclair_typebox.Type.Union(literals, options);
	}
	switch (type) {
		case "number": return _sinclair_typebox.Type.Number(options);
		case "integer": return _sinclair_typebox.Type.Integer(options);
		case "boolean": return _sinclair_typebox.Type.Boolean(options);
		case "array": return _sinclair_typebox.Type.Array(items ? toSchema(items) : _sinclair_typebox.Type.String(), options);
		default: return _sinclair_typebox.Type.String(options);
	}
};
var present = (value, schema) => {
	if (_sinclair_typebox.KindGuard.IsSchema(value)) return !(_sinclair_typebox.OptionalKind in schema);
	const declaration = value;
	return declaration.required === true || declaration.default !== void 0;
};
//#endregion
exports.bool = bool;
exports.cmd = cmd;
exports.default = macro_default;
exports.int = int;
exports.list = list;
exports.num = num;
exports.of = of;
exports.str = str;

//# sourceMappingURL=macro.cjs.map