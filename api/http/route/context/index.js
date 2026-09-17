import "../../../core/index.js";
import "../types.js";
import { handlers } from "./reply.js";
import { extractor } from "./extract.js";
//#region lib/api/src/http/route/context/index.ts
var contextFactory = (e) => {
	const ext = extractor(e);
	const ctx = e.context;
	const context = ctx ? typeof ctx === "function" ? (req) => ctx(req) : () => ctx : () => ({});
	return (rt) => {
		const params = ext(rt);
		return async (req) => [{
			...handlers(req),
			request: req,
			params: await params(req),
			spec: rt
		}, await context(req)];
	};
};
//#endregion
export { contextFactory };

//# sourceMappingURL=index.js.map