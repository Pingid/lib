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
* OpenApi({ info: { title: 'Items', version: '1.0.0' }, routes: [getItem], models: { Item } })
*/
var OpenApi = (config) => resolve(config);
/**
* Serve a Scalar API reference at `prefix`, and its OpenAPI document at `${prefix}/json`.
*
* The docs routes stay out of the document. Mount `handler` directly, or `Page` and `Docs` through an adapter.
*
* @example
* const docs = Scalar('/docs', { info: { title: 'Items', version: '1.0.0' }, routes: [getItem] })
* Bun.serve({ routes: bunRoutes([docs.Page, docs.Docs]) })
*/
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
	const { scalar: config, embed, ...openapi } = docs;
	const gen = resolve(openapi);
	const page = scalar(gen.info, embed ? {
		...config,
		content: gen
	} : {
		url: DocsSpec.path,
		...config
	});
	const Page = Route(PageSpec, (c) => c.html(page));
	const Docs = Route(DocsSpec, (c) => c.json(gen));
	const handler = (req) => {
		const path = new URL(req.url).pathname.replace(/(.)\/+$/, "$1");
		const route = path === PageSpec.path ? Page : path === DocsSpec.path ? Docs : void 0;
		if (!route) return Promise.resolve(new Response(null, { status: 404 }));
		if (req.method !== "GET" && req.method !== "HEAD") return Promise.resolve(new Response(null, {
			status: 405,
			headers: { Allow: "GET, HEAD" }
		}));
		return route.fetch(req);
	};
	return {
		handler,
		Page,
		Docs,
		document: gen
	};
};
//#endregion
export { OpenApi, Scalar };

//# sourceMappingURL=index.js.map