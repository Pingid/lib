import { Cmd } from "./cmd.js";
import { KindGuard, OptionalKind, Type } from "@sinclair/typebox";
//#region lib/api/src/cli/macro.ts
var field = (type, options) => ({
	...typeof options === "string" ? { description: options } : options,
	type
});
var str = (options) => field(Type.String(), options);
var num = (options) => field(Type.Number(), options);
var int = (options) => field(Type.Integer(), options);
var bool = (options) => field(Type.Boolean(), options);
var of = (first, second) => {
	const inline = Array.isArray(first);
	const values = inline ? first : first.enum;
	const { enum: _, ...rest } = inline ? typeof second === "string" ? { description: second } : second ?? {} : first;
	const literals = values.map((value) => Type.Literal(value));
	return field(literals.length === 1 ? literals[0] : Type.Union(literals), rest);
};
var list = (first, second) => {
	const declared = isValue(first);
	const items = declared ? toSchema(first) : Type.String();
	return field(Type.Array(items), declared ? second : first);
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
		properties[key] = present(value, schema) ? schema : Type.Optional(schema);
		if (value.positional) positional.push(key);
		const source = value.complete;
		if (source !== void 0) sources[key] = source;
	}
	const command = Cmd.build(def.name).in(Type.Object(properties));
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
var isValue = (value) => typeof value === "object" && value !== null && (KindGuard.IsSchema(value) || "type" in value);
var toSchema = (value) => {
	if (KindGuard.IsSchema(value)) return value;
	const { type, required, positional, complete, ...rest } = value;
	if (KindGuard.IsSchema(type)) return {
		...type,
		...rest
	};
	return fromJson(value);
};
/** The literal shorthand to a TypeBox schema, so one path runs the validation. */
var fromJson = (json) => {
	const { type, items, enum: values, required, positional, complete, ...options } = json;
	if (values) {
		const literals = values.map((value) => Type.Literal(value));
		if (literals.length === 1) return {
			...literals[0],
			...options
		};
		return Type.Union(literals, options);
	}
	switch (type) {
		case "number": return Type.Number(options);
		case "integer": return Type.Integer(options);
		case "boolean": return Type.Boolean(options);
		case "array": return Type.Array(items ? toSchema(items) : Type.String(), options);
		default: return Type.String(options);
	}
};
var present = (value, schema) => {
	if (KindGuard.IsSchema(value)) return !(OptionalKind in schema);
	const declaration = value;
	return declaration.required === true || declaration.default !== void 0;
};
//#endregion
export { bool, cmd, macro_default as default, int, list, num, of, str };

//# sourceMappingURL=macro.js.map