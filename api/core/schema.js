import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { KindGuard } from "@sinclair/typebox/type";
import { Value } from "@sinclair/typebox/value";
//#region lib/api/src/core/schema.ts
var schema_exports = /* @__PURE__ */ __exportAll({
	Result: () => Result,
	toJson: () => toJson,
	validate: () => validate
});
var toJson = (schema) => {
	if (!isStandard(schema)) return schema;
	return schema["~standard"].jsonSchema.input({ target: "draft-07" });
};
var validate = async (input, schema) => {
	if (schema === void 0) return Result.ok(input);
	const validate = props(schema)?.validate;
	if (typeof validate === "function") {
		const result = await validate(input);
		if (!result.issues) return Result.ok(result.value);
		return Result.err(result.issues.map(standardIssue));
	}
	if (KindGuard.IsSchema(schema)) {
		const value = Value.Convert(schema, input);
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
export { Result, schema_exports, toJson, validate };

//# sourceMappingURL=schema.js.map