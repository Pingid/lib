const require_api = require("./api.cjs");
//#region lib/api/src/core/util/visit.ts
/**
* Match one path segment against a namespace's children.
*
* There is no `children()` helper: since every namespace is named, a
* namespace's children are exactly its `cmds`.
*/
var findChild = (ns, segment) => require_api.of(require_api.of(ns).operations.find((c) => require_api.of(c).name === segment));
//#endregion
exports.findChild = findChild;

//# sourceMappingURL=visit.cjs.map