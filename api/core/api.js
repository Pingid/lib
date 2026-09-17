import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import "./schema.js";
//#region lib/api/src/core/api.ts
var api_exports = /* @__PURE__ */ __exportAll({
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
export { Tag, api_exports, group, isGroup, method };

//# sourceMappingURL=api.js.map