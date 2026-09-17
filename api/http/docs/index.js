import { Route } from "../route/index.js";
import { resolve } from "./openapi/index.js";
import { scalar } from "./scalar/index.js";
import { Type } from "@sinclair/typebox";
//#region lib/api/src/http/docs/index.ts
/**
* Build an OpenAPI 3.1 document from routes.
*
* Object bodies and responses are hoisted into `components.schemas` and deduplicated by structure.
*
* @example
* openapi({ info: { title: 'Items', version: '1.0.0' }, routes: [getItem], models: { Item } })
*/
var OpenApi = (config) => resolve(config);
var Scalar = (prefix, docs) => {
	const PageSpec = {
		method: "GET",
		path: prefix,
		response: { 200: { "text/html": Type.String() } }
	};
	const DocsSpec = {
		method: "GET",
		path: `${prefix}/json`,
		response: { 200: { "application/json": Type.Object({}, { description: "OpenAPI 3.1 document" }) } }
	};
	const gen = resolve({
		...docs,
		routes: [
			PageSpec,
			DocsSpec,
			...docs.routes
		]
	});
	const page = scalar(gen.info, {
		...docs.scalar,
		content: docs.embed ? gen : void 0
	});
	const Page = Route(PageSpec, (c) => c.html(page));
	const Docs = Route(DocsSpec, (c) => c.json(gen));
	const handler = (req) => {
		const path = new URL(req.url).pathname;
		if (path === prefix) return Page.fetch(req);
		if (path === `${prefix}/json`) return Docs.fetch(req);
	};
	return {
		handler,
		Page,
		Docs
	};
};
//#endregion
export { OpenApi, Scalar };

//# sourceMappingURL=index.js.map