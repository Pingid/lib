import { of } from "../../core/register.js";
import { defaultOf } from "../../core/util/schema.js";
import { inputs } from "../../core/util/bind.js";
import "../../core/util/index.js";
//#region lib/api/src/cli/core/fields.ts
/** Read an operation's inputs the way the command line needs them. */
var inputsOf = (op) => {
	const cli = operationMeta(op);
	const inputs$1 = inputs(op.in);
	return {
		inputs: inputs$1,
		fields: inputs$1.properties.map((property) => {
			const field = property.schema === void 0 ? {} : fieldMeta(property.schema);
			const aliases = [...field.short === void 0 ? [] : [field.short], ...field.aliases ?? []];
			return {
				key: property.key,
				names: [.../* @__PURE__ */ new Set([
					property.key,
					...aliases,
					...cli.aliases?.[property.key] ?? []
				])],
				description: property.json.description ?? "",
				shape: property.shape,
				schema: property.schema,
				required: defaultOf(property.json) === void 0 && fallbackFor(property) === void 0,
				default: defaultOf(property.json)?.value
			};
		}),
		positionals: [...cli.positionals ?? []].map(String)
	};
};
/**
* What an input is worth when it was not written.
*
* This is the command line's policy rather than a fact about the operation: a
* bool that is not passed is `false` and a list that is not repeated is empty,
* so neither is ever demanded. Another target answers the same question its own
* way — a tool call substitutes nothing at all — which is why the operation does
* not answer it.
*
* A default the schema declares is not here: `bind` applies that for every
* target before it asks. What is left is only this target's own standing in,
* which is why this is `Policy.fallback` as it is written.
*/
var fallbackFor = (property) => {
	if (property.shape.list) return { value: [] };
	if (property.shape.type === "boolean") return { value: false };
	if (property.shape.optional || !property.required) return { value: void 0 };
};
/** The command line's names for the JSON types, so help reads as a terminal does. */
var LABEL = {
	string: "string",
	number: "num",
	integer: "int",
	boolean: "bool",
	null: "null",
	object: "json",
	unknown: "value"
};
var base = (shape) => shape.values === void 0 ? LABEL[shape.type] : shape.values.join("|");
/** Type as help writes it: `num`, `string[]`, `string?`, `fast|safe`. */
var typeLabel = (shape) => `${base(shape)}${shape.list ? "[]" : ""}${shape.optional ? "?" : ""}`;
/** The label inside a flag's angle brackets: `<fast|safe>`, `<string...>`. */
var valueLabel = (shape) => `${base(shape)}${shape.list ? "..." : ""}`;
var fieldMeta = (schema) => of(schema, "cli") ?? {};
var operationMeta = (op) => of(op, "cli") ?? {};
//#endregion
export { fallbackFor, fieldMeta, inputsOf, operationMeta, typeLabel, valueLabel };

//# sourceMappingURL=fields.js.map