import { of } from "./api.js";
//#region lib/api/src/core/util/visit.ts
/**
* Match one path segment against a namespace's children.
*
* There is no `children()` helper: since every namespace is named, a
* namespace's children are exactly its `cmds`.
*/
var findChild = (ns, segment) => of(of(ns).operations.find((c) => of(c).name === segment));
//#endregion
export { findChild };

//# sourceMappingURL=visit.js.map