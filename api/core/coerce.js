import { Result } from "./schema.js";
import { format } from "./text.js";
//#region lib/api/src/core/coerce.ts
/**
* Reading a wire value into the type its JSON Schema fragment declares.
*
* Argv and a query string have the same problem: everything arrives as a string, and only the
* schema knows what it was meant to be. `Schema.validate` converts for TypeBox but not for a
* standard schema, and a route must not behave differently by schema library — so coercion
* happens here, before validation, for both.
*
* @example
* ```ts
* tokens({ type: 'integer' }, ['5']) // 5
* tokens({ type: 'array', items: { type: 'integer' } }, ['1', '2']) // [1, 2]
* tokens({ type: 'integer' }, ['nope']) // 'nope' — the validator reports it
* ```
*
* @module
*/
/** Enumerated values, whether spelled as `enum` or as a union of `const` branches. */
var choices = (json) => {
	if (json.enum) return json.enum;
	const branches = json.oneOf ?? json.anyOf;
	if (!branches || branches.length === 0 || !branches.every((branch) => "const" in branch)) return void 0;
	return branches.map((branch) => branch["const"]);
};
/**
* One token to a typed value. The error side is the *expectation*, not a sentence, so each
* caller frames it for its own transport — `Arg` names the flag, HTTP names the input key.
*
* @example
* ```ts
* token({ type: 'boolean' }, 'yes') // { ok: true, value: true }
* token({ enum: ['a', 'b'] }, 'c') // { ok: false, error: 'one of a, b' }
* ```
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
//#endregion
export { choices, token };

//# sourceMappingURL=coerce.js.map