import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { Value } from "@sinclair/typebox/value";
import { KindGuard } from "@sinclair/typebox";
//#region lib/api/src/core/schema.ts
var schema_exports = /* @__PURE__ */ __exportAll({
	Result: () => Result,
	convert: () => convert,
	is: () => is,
	toJson: () => toJson,
	validate: () => validate
});
/** JSON Schema for a schema's `input` (what is sent) or `output` (what validation yields). */
var toJson = (schema, io = "input", target = "draft-07") => {
	if (!isStandard(schema)) return schema;
	return schema["~standard"].jsonSchema[io]({ target });
};
/** True for a Standard JSON schema or a TypeBox schema. */
var is = (value) => isStandard(value) || KindGuard.IsSchema(value);
/** Coerce string input toward a TypeBox schema, e.g. `'5'` for an integer. Other schemas get the value unchanged. */
var convert = (schema, value) => KindGuard.IsSchema(schema) ? Value.Convert(schema, value) : value;
var validate = async (input, schema) => {
	if (schema === void 0) return Result.ok(input);
	const validate = props(schema)?.validate;
	if (typeof validate === "function") {
		const result = await validate(input);
		if (!result.issues) return Result.ok(result.value);
		return Result.err(result.issues.map(standardIssue));
	}
	if (KindGuard.IsSchema(schema)) {
		const value = convert(schema, input);
		if (!Value.Check(schema, value)) return Result.err([...Value.Errors(schema, value)].map(typeboxIssue));
		return Result.ok(Value.Decode(schema, value));
	}
	return Result.ok(input);
};
var standardIssue = (issue) => ({
	path: (issue.path ?? []).map((part) => typeof part === "object" && part !== null ? part.key : part).join("."),
	message: issue.message
});
var typeboxIssue = (error) => ({
	path: error.path.split("/").filter(Boolean).join("."),
	message: error.message
});
var isStandard = (schema) => {
	return (typeof schema === "object" || typeof schema === "function") && schema !== null && "~standard" in schema && typeof schema["~standard"] === "object" && schema["~standard"] !== null && "jsonSchema" in schema["~standard"];
};
var props = (schema) => schema?.["~standard"];
var Result = {
	ok: (value) => ({
		ok: true,
		value
	}),
	err: (error) => ({
		ok: false,
		error
	})
};
//#endregion
export { Result, convert, is, schema_exports, toJson, validate };

//# sourceMappingURL=schema.js.map