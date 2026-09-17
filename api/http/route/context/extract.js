import { validate as validate$1 } from "../../../core/schema.js";
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
	const schema = rt?.body;
	if (schema === void 0) return () => void 0;
	return async (req, s) => validate(s ?? schema, await req.json());
};
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
export { extractor, validate };

//# sourceMappingURL=extract.js.map