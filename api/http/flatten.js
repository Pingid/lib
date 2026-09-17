//#region lib/api/src/http/flatten.ts
/**
* The flat input, rebuilt from parts a framework has already parsed and validated.
*
* The alternative is to re-read the `Request` with `assemble`, which would work but would
* decode and validate everything twice — once in the framework because we handed it the
* schemas, once here. Reading the parts back is what makes handing them over worth doing.
*/
var flatten = (route, parts, request) => {
	const input = {};
	for (const [key, binding] of Object.entries(route.bindings)) {
		if (binding.source === "raw") {
			if (request) input[key] = request;
			continue;
		}
		const part = parts[binding.source];
		if (part === null || typeof part !== "object") continue;
		const value = part[binding.name];
		if (value !== void 0) input[key] = value;
	}
	return input;
};
//#endregion
export { flatten };

//# sourceMappingURL=flatten.js.map