import { NEVER as NEVER$1, name, ref, rewrite, union } from "./ast.js";
import { Is, Media, Name, Route, mapTypes } from "./model.js";
import { Doc } from "./doc.js";
import ts from "typescript";
import * as oas from "openapi-typescript";
//#region lib/openapi/src/gen/read.ts
/** Loads a document and flattens it into the editable model. */
var read = async (source, options = {}) => {
	const config = options.config ?? await Doc.config();
	const doc = await Doc.load(source, {
		...options,
		config
	});
	const binary = options.binary === void 0 ? BLOB : options.binary;
	const ctx = Doc.context(doc, config, {
		...options.ts,
		transform: bytes(binary, options.ts?.transform)
	});
	return link({
		decls: schemas(doc, ctx),
		routes: routes(doc, ctx, binary)
	});
};
var BLOB = ref("Blob");
/** Types `format: binary` as `binary`, after whatever transform the caller supplied has had its say. */
var bytes = (binary, over) => (schema, options) => {
	const own = over?.(schema, options);
	if (own || !binary || schema.format !== "binary") return own;
	return Is.nullable(schema) ? union([binary, oas.NULL]) : binary;
};
var schemas = (doc, ctx) => Object.entries(doc.components?.schemas ?? {}).map(([name, schema]) => {
	const id = oas.createRef([
		"components",
		"schemas",
		name
	]);
	return {
		id,
		name: Name.identifier(name),
		type: oas.transformSchemaObject(schema, {
			path: id,
			schema,
			ctx
		}),
		docs: schema.description,
		deprecated: schema.deprecated,
		origin: {
			kind: "schema",
			name
		}
	};
});
var routes = (doc, ctx, binary) => Object.entries(doc.paths ?? {}).flatMap(([url, raw]) => {
	const item = deref(raw, ctx);
	return item ? Route.methods.flatMap((method) => route(url, method, item, {
		ctx,
		binary
	})) : [];
});
var route = (url, method, item, reading) => {
	const { ctx } = reading;
	const op = deref(item[method], ctx);
	if (!op) return [];
	const at = oas.createRef([
		"paths",
		url,
		method
	]);
	return [{
		id: op.operationId ?? `${method} ${url}`,
		url,
		method,
		group: [],
		params: params([...item.parameters ?? [], ...op.parameters ?? []], at, ctx),
		bodies: bodies(op.requestBody, at, reading),
		replies: replies(op.responses, at, reading),
		tags: op.tags ?? [],
		summary: op.summary,
		docs: op.description,
		deprecated: op.deprecated || void 0,
		source: op
	}];
};
/** Path-level and operation-level parameters, deduped by location and name. */
var params = (list, at, ctx) => {
	const unique = /* @__PURE__ */ new Map();
	for (const raw of list) {
		const param = deref(raw, ctx);
		if (param) unique.set(`${param.in}-${param.name}`, param);
	}
	return [...unique.values()].map((source) => ({
		in: source.in,
		name: source.name,
		required: source.in === "path" || !!source.required,
		type: oas.transformParameterObject(source, {
			path: oas.createRef([
				at,
				"parameters",
				source.in,
				source.name
			]),
			ctx
		}),
		docs: source.description,
		deprecated: source.deprecated || void 0,
		source
	}));
};
var bodies = (raw, at, reading) => {
	const body = deref(raw, reading.ctx);
	return contents(body?.content, oas.createRef([
		at,
		"requestBody",
		"content"
	]), reading).map((content) => ({
		...content,
		required: !!body?.required
	}));
};
var replies = (responses, at, reading) => Object.entries(responses ?? {}).flatMap(([status, raw]) => {
	const response = deref(raw, reading.ctx);
	if (!response) return [];
	const variants = contents(response.content, oas.createRef([
		at,
		"responses",
		status,
		"content"
	]), reading);
	const docs = response.description;
	const sent = headers(response.headers, oas.createRef([
		at,
		"responses",
		status,
		"headers"
	]), reading.ctx);
	if (!variants.length) return [{
		status,
		media: null,
		type: NEVER$1,
		docs,
		headers: sent
	}];
	return variants.map((content) => ({
		...content,
		status,
		docs,
		headers: sent
	}));
});
/** A response's headers. `Content-Type` is left out: the content map already says it, per media type. */
var headers = (raw, at, ctx) => Object.entries(raw ?? {}).flatMap(([name, value]) => {
	const header = deref(value, ctx);
	if (!header || /^content-type$/i.test(name)) return [];
	return [{
		name,
		required: !!header.required,
		type: oas.transformHeaderObject(header, {
			path: oas.createRef([at, name]),
			ctx
		}),
		docs: header.description,
		deprecated: header.deprecated || void 0
	}];
});
/** Each content type, paired with its emitted type and the schema that produced it. */
var contents = (content, at, { ctx, binary }) => Object.entries(content ?? {}).flatMap((entry) => {
	const [media, raw] = entry;
	const value = deref(raw, ctx);
	if (!value) return [];
	const schema = deref(value.schema, ctx);
	return [{
		media,
		type: binary && Media.binary(media) && opaque(schema) ? binary : oas.transformMediaTypeObject(value, {
			path: oas.createRef([at, media]),
			ctx
		}),
		schema
	}];
});
/** A schema that says no more than "a string", or nothing at all: what a binary body is, given no better. */
var opaque = (schema) => !schema || Object.keys(schema).length === 0 || schema.type === "string" && !("enum" in schema) && !("const" in schema) && !("pattern" in schema);
/**
* openapi-typescript renders `$ref` as `components["schemas"]["Foo"]`, which only holds
* while the document keeps its original shape. The pipeline reshapes it, so references
* collapse to their pointer here and are re-bound to whatever name `print` settles on.
*/
var link = (api) => mapTypes(api, (type) => rewrite(type, (node) => component(node) ?? node));
var component = (node) => {
	if (!ts.isIndexedAccessTypeNode(node) || !ts.isIndexedAccessTypeNode(node.objectType)) return void 0;
	const { objectType: root, indexType: kind } = node.objectType;
	if (!ts.isTypeReferenceNode(root) || name(root) !== "components") return void 0;
	const parts = [literal(kind), literal(node.indexType)];
	return parts.every((part) => part) ? ref(oas.createRef(["components", ...parts])) : void 0;
};
var literal = (node) => ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal) ? node.literal.text : void 0;
var deref = (value, ctx) => {
	if (!value || typeof value !== "object") return void 0;
	return "$ref" in value ? ctx.resolve(value.$ref) : value;
};
//#endregion
export { read };

//# sourceMappingURL=read.js.map