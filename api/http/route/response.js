import { is } from "../../core/schema.js";
import "../../core/index.js";
//#region lib/api/src/http/route/response.ts
/** Normalise the three `response` shapes into `{ [status]: { [contentType]: schema | meta } }`. */
var byStatus = (r) => {
	if (!r) return { 200: void 0 };
	if (is(r)) return { 200: { "application/json": r } };
	return Object.keys(r).every((k) => /^\d{3}$|^default$/.test(k)) ? r : { 200: r };
};
//#endregion
export { byStatus };

//# sourceMappingURL=response.js.map