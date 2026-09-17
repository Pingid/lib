Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_schema = require("./schema.cjs");
const require_api = require("./api.cjs");
Object.defineProperty(exports, "Api", {
	enumerable: true,
	get: function() {
		return require_api.api_exports;
	}
});
Object.defineProperty(exports, "Schema", {
	enumerable: true,
	get: function() {
		return require_schema.schema_exports;
	}
});
