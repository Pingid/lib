const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
let _sinclair_typebox_type = require("@sinclair/typebox/type");
let _sinclair_typebox_value = require("@sinclair/typebox/value");
//#region lib/api/src/core/schema.ts
var schema_exports = /* @__PURE__ */ require_runtime.__exportAll({
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
	if (_sinclair_typebox_type.KindGuard.IsSchema(schema)) {
		const value = _sinclair_typebox_value.Value.Convert(schema, input);
		if (!_sinclair_typebox_value.Value.Check(schema, value)) return Result.err([..._sinclair_typebox_value.Value.Errors(schema, value)].map(typeboxIssue));
		return Result.ok(_sinclair_typebox_value.Value.Decode(schema, value));
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
exports.Result = Result;
Object.defineProperty(exports, "schema_exports", {
	enumerable: true,
	get: function() {
		return schema_exports;
	}
});
exports.toJson = toJson;
exports.validate = validate;

//# sourceMappingURL=schema.cjs.map