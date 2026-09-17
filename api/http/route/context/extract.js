import { is, validate as validate$1 } from "../../../core/schema.js";
import "../../../core/index.js";
import "../types.js";
import { json } from "./reply.js";
//#region lib/api/src/http/route/context/extract.ts
var extractor = (e) => (rt) => {
	const ex = {
		body: extractBody(rt),
		query: extractQuery(rt),
		path: extractPath(rt),
		...e
	};
	return async (req) => ({
		body: await ex.body(req, rt.body),
		query: await ex.query(req, rt.query),
		path: await ex.path(req, rt.params)
	});
};
var extractPath = (rt) => {
	if (!rt?.path) return () => void 0;
	const paramsOf = pathParams(rt.path);
	return async (req, s) => {
		const schema = s ?? rt.params;
		return schema ? validate(schema, paramsOf(req.url)) : paramsOf(req.url);
	};
};
var extractBody = (rt) => {
	if (rt?.body === void 0) return () => void 0;
	return (req, s) => readBody(s ?? rt.body, req, {
		json: () => req.json(),
		binary: () => req.arrayBuffer()
	});
};
/**
* Read a body as declared: bytes for `application/octet-stream`, otherwise JSON checked against its schema.
* A body declaring both is read by the request's content type.
*/
var readBody = async (spec, req, read) => {
	if (!spec) return void 0;
	const json = bodySchema(spec);
	if (!is(spec) && "application/octet-stream" in spec && !(json && req.headers.get("content-type")?.includes("json"))) return read.binary();
	return json ? validate(json, await read.json()) : void 0;
};
/** The JSON schema a body declares, if any. */
var bodySchema = (spec) => !spec ? void 0 : is(spec) ? spec : spec["application/json"];
var extractQuery = (rt) => {
	const schema = rt?.query;
	if (schema === void 0) return () => void 0;
	return async (req, s) => validate(s ?? schema, Object.fromEntries(new URL(req.url, "http://localhost").searchParams));
};
/** Rejects with a 422 `Response`, which the route adapter returns as-is. */
var validate = async (schema, value) => {
	const result = await validate$1(value, schema);
	if (result.ok) return result.value;
	return Promise.reject(json({
		error: "validation",
		issues: result.error
	}, { status: 422 }));
};
var pathParams = (def) => {
	const keys = [];
	const pattern = def.split("/").map((part) => {
		if (part.startsWith(":")) {
			keys.push(part.slice(1));
			return "([^/]+)";
		}
		if (part.endsWith("...")) return `${escapeRegex(part.slice(0, -3))}.*`;
		return escapeRegex(part);
	}).join("/");
	const regex = new RegExp(`^${pattern}$`);
	return (url) => {
		const pathname = url instanceof URL ? url.pathname : new URL(url, "http://localhost").pathname;
		const match = regex.exec(pathname);
		if (!match) return {};
		return Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
	};
};
var escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//#endregion
export { bodySchema, extractor, readBody, validate };

//# sourceMappingURL=extract.js.map