import { is, toJson as toJson$1 } from "../../../core/schema.js";
import "../../../core/index.js";
import { bodySchema } from "../../route/context/extract.js";
import { byStatus } from "../../route/response.js";
import { createRegistry, pascal } from "./registry.js";
//#region lib/api/src/http/docs/openapi/index.ts
/**
* Build an OpenAPI 3.2 document from routes.
*
* Object bodies and responses are hoisted into `components.schemas` and deduplicated by structure.
*
* @example
* openapi({ info: { title: 'Items', version: '1.0.0' }, routes: [getItem], models: { Item } })
*/
var resolve = (config) => {
	const { routes, models = {}, refs, dedupe, operationId = operationIdOf, name = nameOf, ...doc } = config;
	const reg = createRegistry({
		refs,
		dedupe
	}, doc.components?.schemas);
	reg.models(Object.fromEntries(Object.entries(models).map(([n, s]) => [n, toJson(s)])));
	const ids = /* @__PURE__ */ new Set();
	const operation = (spec) => {
		const { method, path = "", body, query, params, response, ...meta } = spec;
		const id = unique(ids, operationId(spec));
		const refer = (s, ctx) => reg.refer(toJson(s), name({
			operationId: id,
			...ctx
		}));
		const [pathJson, queryJson] = [params, query].map((s) => s ? toJson(s) : {});
		for (const json of [pathJson, queryJson]) reg.defines(json);
		const parameters = [...parametersOf("path", pathJson, pathNames(path)), ...parametersOf("query", queryJson)].map((p) => ({
			...p,
			schema: reg.refer(p.schema)
		}));
		return defined({
			...meta,
			operationId: id,
			parameters: parameters.length ? parameters : void 0,
			requestBody: body && {
				required: true,
				content: requestContent(body, (s) => refer(s, { role: "body" }))
			},
			responses: Object.fromEntries(Object.entries(byStatus(response)).map(([status, protocols]) => {
				const entries = Object.entries(protocols ?? {});
				const content = entries.map(([type, v]) => [type, !is(v) ? type === "application/octet-stream" ? { schema: BINARY } : {} : type === "text/event-stream" ? { itemSchema: event(refer(v, {
					role: "response",
					status,
					type
				})) } : { schema: refer(v, {
					role: "response",
					status,
					type
				}) }]);
				return [status, defined({
					description: entries.map(([, v]) => v?.description).find(Boolean) ?? STATUS[status] ?? "Response",
					content: content.length ? Object.fromEntries(content) : void 0
				})];
			}))
		});
	};
	const paths = { ...doc.paths };
	for (const r of routes) {
		const spec = "handler" in r ? r.spec : r;
		if (!spec.path) continue;
		const p = spec.path.replace(/:(\w+)/g, "{$1}");
		paths[p] = {
			...paths[p],
			[(spec.method ?? "GET").toLowerCase()]: operation(spec)
		};
	}
	const schemas = reg.schemas;
	return {
		openapi: "3.2.0",
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
var nameOf = ({ operationId, role, status = "200", type = "application/json" }) => pascal(operationId) + (role === "body" ? "Body" : `${status === "200" ? "" : pascal(status)}${type === "application/json" ? "" : pascal(type.split("/")[1] ?? "")}Response`);
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
var BINARY = {
	type: "string",
	contentMediaType: "application/octet-stream"
};
/** JSON Schema in the dialect OpenAPI 3.2 uses. */
var toJson = (schema) => toJson$1(schema, "input", "draft-2020-12");
/** `id`, or `id` with the first free numeric suffix once `taken` holds it. Claims the result. */
var unique = (taken, id) => {
	let out = id;
	for (let i = 2; taken.has(out); i++) out = `${id}${i}`;
	taken.add(out);
	return out;
};
/** One server-sent event: `data` holds the JSON the route streams. */
var event = (schema) => ({
	type: "object",
	required: ["data"],
	properties: { data: {
		type: "string",
		contentMediaType: "application/json",
		contentSchema: schema
	} }
});
/** A request body's content by media type: its JSON schema, and bytes when it declares octet-stream. */
var requestContent = (body, refer) => {
	const json = bodySchema(body);
	const bytes = !is(body) && "application/octet-stream" in body;
	return defined({
		"application/json": json && { schema: refer(json) },
		"application/octet-stream": bytes ? { schema: BINARY } : void 0
	});
};
var pathNames = (path) => path.split("/").filter((s) => PARAM.test(s)).map((s) => s.replace(/[:{}]/g, ""));
/**
* Expand an object schema into parameters. Path names without a schema default to strings, and path
* parameters the path does not name are left out.
*/
var parametersOf = (loc, json, names = []) => {
	const props = {
		...Object.fromEntries(names.map((n) => [n, { type: "string" }])),
		...json.properties
	};
	return Object.entries(props).filter(([name]) => loc === "query" || names.includes(name)).map(([name, s]) => defined({
		name,
		in: loc,
		required: loc === "path" || !!json.required?.includes(name),
		description: s.description,
		schema: s
	}));
};
var defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
//#endregion
export { resolve };

//# sourceMappingURL=index.js.map