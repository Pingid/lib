Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_index = require("./git/index.cjs");
Object.defineProperty(exports, "git", {
	enumerable: true,
	get: function() {
		return require_index.git_exports;
	}
});
