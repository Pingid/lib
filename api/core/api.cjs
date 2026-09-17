const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
require("./schema.cjs");
//#region lib/api/src/core/api.ts
var api_exports = /* @__PURE__ */ require_runtime.__exportAll({
	Tag: () => Tag,
	group: () => group,
	isGroup: () => isGroup,
	method: () => method
});
/** Symbol key applied to types */
var Tag = Symbol.for("@pingig/lib/api/core/Tag");
var isGroup = (node) => node[Tag] === "group";
var group = (spec) => ({
	...spec,
	[Tag]: "group"
});
var method = (handle, spec) => {
	return typeof handle === "function" ? {
		...spec,
		handle
	} : handle;
};
//#endregion
exports.Tag = Tag;
Object.defineProperty(exports, "api_exports", {
	enumerable: true,
	get: function() {
		return api_exports;
	}
});
exports.group = group;
exports.isGroup = isGroup;
exports.method = method;

//# sourceMappingURL=api.cjs.map