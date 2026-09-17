const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_ast = require("./ast.cjs");
const require_model = require("./model.cjs");
const require_doc = require("./doc.cjs");
let typescript = require("typescript");
typescript = require_runtime.__toESM(typescript, 1);
let openapi_typescript = require("openapi-typescript");
openapi_typescript = require_runtime.__toESM(openapi_typescript, 1);
//#region lib/openapi/src/gen/read.ts
/** Loads a document and flattens it into the editable model. */
var read = async (source, options = {}) => {
	const config = options.config ?? await require_doc.Doc.config();
	const doc = await require_doc.Doc.load(source, {
		...options,
		config
	});
	const ctx = require_doc.Doc.context(doc, config, options.ts);
	return link({
		decls: schemas(doc, ctx),
		routes: routes(doc, ctx)
	});
};
var schemas = (doc, ctx) => Object.entries(doc.components?.schemas ?? {}).map(([name, schema]) => {
	const id = openapi_typescript.createRef([
		"components",
		"schemas",
		name
	]);
	return {
		id,
		name: require_model.Name.identifier(name),
		type: openapi_typescript.transformSchemaObject(schema, {
			path: id,
			schema,
			ctx
		}),
		docs: schema.description,
		origin: {
			kind: "schema",
			name
		}
	};
});
var routes = (doc, ctx) => Object.entries(doc.paths ?? {}).flatMap(([url, raw]) => {
	const item = deref(raw, ctx);
	return item ? require_model.Route.methods.flatMap((method) => route(url, method, item, ctx)) : [];
});
var route = (url, method, item, ctx) => {
	const op = deref(item[method], ctx);
	if (!op) return [];
	const at = openapi_typescript.createRef([
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
		bodies: bodies(op.requestBody, at, ctx),
		replies: replies(op.responses, at, ctx),
		tags: op.tags ?? [],
		docs: op.description ?? op.summary,
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
		type: openapi_typescript.transformParameterObject(source, {
			path: openapi_typescript.createRef([
				at,
				"parameters",
				source.in,
				source.name
			]),
			ctx
		}),
		docs: source.description,
		source
	}));
};
var bodies = (raw, at, ctx) => {
	const body = deref(raw, ctx);
	return contents(body?.content, openapi_typescript.createRef([
		at,
		"requestBody",
		"content"
	]), ctx).map((content) => ({
		...content,
		required: !!body?.required
	}));
};
var replies = (responses, at, ctx) => Object.entries(responses ?? {}).flatMap(([status, raw]) => {
	const response = deref(raw, ctx);
	if (!response) return [];
	const variants = contents(response.content, openapi_typescript.createRef([
		at,
		"responses",
		status,
		"content"
	]), ctx);
	const docs = response.description;
	if (!variants.length) return [{
		status,
		media: null,
		type: openapi_typescript.NEVER,
		docs
	}];
	return variants.map((content) => ({
		...content,
		status,
		docs
	}));
});
/** Each content type, paired with its emitted type and the schema that produced it. */
var contents = (content, at, ctx) => Object.entries(content ?? {}).flatMap((entry) => {
	const [media, raw] = entry;
	const value = deref(raw, ctx);
	if (!value) return [];
	return [{
		media,
		type: openapi_typescript.transformMediaTypeObject(value, {
			path: openapi_typescript.createRef([at, media]),
			ctx
		}),
		schema: deref(value.schema, ctx)
	}];
});
/**
* openapi-typescript renders `$ref` as `components["schemas"]["Foo"]`, which only holds
* while the document keeps its original shape. The pipeline reshapes it, so references
* collapse to their pointer here and are re-bound to whatever name `print` settles on.
*/
var link = (api) => require_model.mapTypes(api, (type) => require_ast.rewrite(type, (node) => component(node) ?? node));
var component = (node) => {
	if (!typescript.default.isIndexedAccessTypeNode(node) || !typescript.default.isIndexedAccessTypeNode(node.objectType)) return void 0;
	const { objectType: root, indexType: kind } = node.objectType;
	if (!typescript.default.isTypeReferenceNode(root) || require_ast.name(root) !== "components") return void 0;
	const parts = [literal(kind), literal(node.indexType)];
	return parts.every((part) => part) ? require_ast.ref(openapi_typescript.createRef(["components", ...parts])) : void 0;
};
var literal = (node) => typescript.default.isLiteralTypeNode(node) && typescript.default.isStringLiteral(node.literal) ? node.literal.text : void 0;
var deref = (value, ctx) => {
	if (!value || typeof value !== "object") return void 0;
	return "$ref" in value ? ctx.resolve(value.$ref) : value;
};
//#endregion
exports.read = read;

//# sourceMappingURL=read.cjs.map