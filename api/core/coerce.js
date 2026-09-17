import { Result } from "./schema.js";
import { format } from "./text.js";
//#region lib/api/src/core/coerce.ts
/**
* Reading a wire value into the type its JSON Schema fragment declares.
*
* Argv and a query string have the same problem — everything arrives as a string, and the
* schema is the only thing that knows what it was meant to be. This lived on `Arg` first,
* which is why the behaviour is spelled out in terms the command line cares about; the HTTP
* layer needs exactly the same decisions, so it moved here rather than being written twice.
*
* `Schema.validate` would coerce for TypeBox on its own via `Value.Convert`, but not for a
* standard schema, and a route's behaviour must not depend on which schema library its author
* reached for. Coercing here, before validation, is what keeps the two dialects identical.
*/
/** Enumerated values, whether spelled as `enum` or as a union of `const` branches. */
var choices = (json) => {
	if (json.enum) return json.enum;
	const branches = json.oneOf ?? json.anyOf;
	if (!branches || branches.length === 0 || !branches.every((branch) => "const" in branch)) return void 0;
	return branches.map((branch) => branch["const"]);
};
/**
* One token to a typed value.
*
* The error side is the *expectation* — `a boolean`, `one of a, b` — not a full sentence, so
* each caller can frame it for its own transport: `Arg` names the flag, the HTTP layer names
* the input key.
*/
var token = (json, value) => {
	const options = choices(json);
	if (options) {
		const index = options.findIndex((option) => String(option) === value);
		if (index === -1) return Result.err(`one of ${options.map(format).join(", ")}`);
		return Result.ok(options[index]);
	}
	const type = Array.isArray(json.type) ? json.type.find((entry) => entry !== "null") : json.type;
	switch (type) {
		case "boolean":
			if (value === "true" || value === "1" || value === "yes") return Result.ok(true);
			if (value === "false" || value === "0" || value === "no") return Result.ok(false);
			return Result.err("a boolean");
		case "integer":
		case "number": {
			const parsed = Number(value);
			if (value.trim() === "" || !Number.isFinite(parsed)) return Result.err("a number");
			if (type === "integer" && !Number.isInteger(parsed)) return Result.err("an integer");
			return Result.ok(parsed);
		}
		case "array":
		case "object": try {
			return Result.ok(JSON.parse(value));
		} catch {
			return Result.err("valid JSON");
		}
		case "string": return Result.ok(value);
		default: {
			const branches = json.oneOf ?? json.anyOf;
			if (!branches) return Result.ok(value);
			for (const branch of branches) {
				const result = token(branch, value);
				if (result.ok) return result;
			}
			return Result.err("a supported value");
		}
	}
};
/**
* Collected tokens to a value, never failing.
*
* A token that cannot be read is handed back as the string it was, so the *validator* reports
* it. That keeps one issue format across both transports — a bad `?page=x` and a bad `--page x`
* produce the same `Schema.Issue`, pathed by the input key — and it is why nothing here throws.
*
* An array soaks up every token; anything else takes the last, so a repeated flag and a repeated
* query parameter agree on which one wins.
*/
var tokens = (json, values) => {
	const last = values[values.length - 1];
	if (json === void 0) return last;
	if ((Array.isArray(json.type) ? json.type.find((entry) => entry !== "null") : json.type) === "array") return values.map((value) => keep(json.items ?? {}, value));
	return last === void 0 ? void 0 : keep(json, last);
};
var keep = (json, value) => {
	const result = token(json, value);
	return result.ok ? result.value : value;
};
//#endregion
export { choices, token, tokens };

//# sourceMappingURL=coerce.js.map