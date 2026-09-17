import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { createRegistry, pascal } from "./registry.js";
import { is, toJson } from "../../core/schema.js";
import "../../core/index.js";
//#region lib/api/src/http/openapi/index.ts
var openapi_exports = /* @__PURE__ */ __exportAll({ document: () => document });
/**
* Build an OpenAPI 3.1 document from routes.
*
* Object bodies and responses are hoisted into `components.schemas` and deduplicated by structure.
*
* @example
* openapi({ info: { title: 'Items', version: '1.0.0' }, routes: [getItem], models: { Item } })
*/
var document = (config) => {
	const { routes, models = {}, refs, dedupe, operationId = operationIdOf, name = nameOf, ...doc } = config;
	const reg = createRegistry({
		refs,
		dedupe
	}, doc.components?.schemas);
	reg.models(Object.fromEntries(Object.entries(models).map(([n, s]) => [n, toJson(s)])));
	const operation = (spec) => {
		const { method, path = "", body, query, params, response, ...meta } = spec;
		const id = operationId(spec);
		const refer = (s, ctx) => reg.refer(toJson(s), name({
			operationId: id,
			...ctx
		}));
		const parameters = [...parametersOf("path", params, pathNames(path)), ...parametersOf("query", query)].map((p) => ({
			...p,
			schema: reg.refer(p.schema)
		}));
		return defined({
			...meta,
			operationId: id,
			parameters: parameters.length ? parameters : void 0,
			requestBody: body && {
				required: true,
				content: { "application/json": { schema: refer(body, { role: "body" }) } }
			},
			responses: Object.fromEntries(Object.entries(byStatus(response)).map(([status, protocols]) => {
				const entries = Object.entries(protocols ?? {});
				const content = entries.map(([type, v]) => [type, is(v) ? { schema: refer(v, {
					role: "response",
					status,
					type
				}) } : {}]);
				return [status, defined({
					description: entries.map(([, v]) => v?.description).find(Boolean) ?? STATUS[status] ?? "Response",
					content: content.length ? Object.fromEntries(content) : void 0
				})];
			}))
		});
	};
	const paths = { ...doc.paths };
	for (const r of routes) {
		const spec = "handler" in r ? r.schema : r;
		if (!spec.path) continue;
		const p = spec.path.replace(/:(\w+)/g, "{$1}");
		paths[p] = {
			...paths[p],
			[(spec.method ?? "GET").toLowerCase()]: operation(spec)
		};
	}
	const schemas = reg.schemas;
	return {
		openapi: "3.1.0",
		info: {
			title: "API",
			version: "1.0.0"
		},
		...doc,
		paths,
		...Object.keys(schemas).length && { components: {
			...doc.components,
			schemas
		} }
	};
};
var operationIdOf = ({ operationId, method = "GET", path = "" }) => operationId ?? method.toLowerCase() + path.split("/").map((s) => PARAM.test(s) ? `By${pascal(s)}` : pascal(s)).join("");
var nameOf = ({ operationId, role, status = "200", type = "application/json" }) => pascal(operationId) + (role === "body" ? "Body" : `${status === "200" ? "" : status}${type === "application/json" ? "" : pascal(type.split("/")[1] ?? "")}Response`);
var STATUS = {
	200: "OK",
	201: "Created",
	202: "Accepted",
	204: "No Content",
	400: "Bad Request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "Not Found",
	409: "Conflict",
	422: "Unprocessable Content",
	500: "Internal Server Error"
};
var PARAM = /^(?::\w+|\{\w+\})$/;
var pathNames = (path) => path.split("/").filter((s) => PARAM.test(s)).map((s) => s.replace(/[:{}]/g, ""));
/** Expand an object schema into parameters. Path names without a schema default to strings. */
var parametersOf = (loc, schema, names = []) => {
	const json = schema ? toJson(schema) : {};
	const props = {
		...Object.fromEntries(names.map((n) => [n, { type: "string" }])),
		...json.properties
	};
	return Object.entries(props).map(([name, s]) => defined({
		name,
		in: loc,
		required: loc === "path" || !!json.required?.includes(name),
		description: s.description,
		schema: s
	}));
};
/** Normalise the three `response` shapes into `{ [status]: { [contentType]: schema | meta } }`. */
var byStatus = (r) => {
	if (!r) return { 200: void 0 };
	if (is(r)) return { 200: { "application/json": r } };
	return Object.keys(r).every((k) => /^\d{3}$|^default$/.test(k)) ? r : { 200: r };
};
var defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
//#endregion
export { document, openapi_exports };

//# sourceMappingURL=index.js.map