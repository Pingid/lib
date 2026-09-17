//#region lib/api/src/core/util/guard.ts
var operation = (n) => "handle" in n;
/**
* Observed rather than declared: a handler may hand back an iterable whatever
* its `out` says, and once a value exists the value is the better authority.
*/
var stream = (v) => typeof v === "object" && v !== null && Symbol.asyncIterator in v;
//#endregion
export { operation, stream };

//# sourceMappingURL=guard.js.map