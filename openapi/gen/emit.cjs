const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_ast = require("./ast.cjs");
const require_model = require("./model.cjs");
let typescript = require("typescript");
typescript = require_runtime.__toESM(typescript, 1);
let openapi_typescript = require("openapi-typescript");
//#region lib/openapi/src/gen/emit.ts
/**
* The model as statements. Everything here takes a *bound* model — one that has been
* through `bind`, so every reference is a real name rather than a pointer placeholder.
* `print` binds for you; reach for these when replacing the file layout via `PrintOptions.emit`:
*
* ```ts
* print(api, { emit: (api) => [...Emit.decls(api), Emit.routes(api, { root: 'Api' }), myOwnNode(api)] })
* ```
*/
var Emit = {
	/** Every declaration, as an `export type` or, where it asked for one, an `export interface`. */
	decls: (api) => api.decls.map(declare),
	/** The routes, nested by group then name, as one interface. */
	routes: (api, options = {}) => require_ast.iface(options.root ?? "Routes", tree(api.routes, options.route ?? Emit.shape)),
	/** The default per-route type: enough to drive a typed client with no further work. */
	shape: (route) => require_ast.obj([
		{
			name: "method",
			type: require_ast.literal(route.method.toUpperCase())
		},
		{
			name: "url",
			type: require_ast.literal(route.url)
		},
		...params(route),
		...body(route),
		...replies(route)
	]),
	/** The default file: the declarations, then the routes interface. */
	file: (api, options = {}) => [...Emit.decls(api), Emit.routes(api, options)]
};
/**
* Settles every name and resolves every reference.
*
* Declarations name themselves whatever they like up to this point; here those names are
* made legal and pulled apart where two collide, and the pointer placeholders left by `read`
* and `Decl.ref` are pointed at the result. A pointer with no declaration behind it — dropped
* by an op, or into a component kind the model does not name — degrades to `unknown` rather
* than emitting a reference that will not compile.
*/
var bind = (api) => {
	const taken = /* @__PURE__ */ new Set();
	const names = /* @__PURE__ */ new Map();
	for (const decl of api.decls) {
		const name = require_model.Name.free(taken, require_model.Name.identifier(decl.name));
		taken.add(name);
		names.set(decl.id, name);
	}
	const resolved = require_model.mapTypes(api, (type) => require_ast.rewrite(type, (node) => {
		const pointer = require_ast.pointerOf(node);
		if (!pointer) return node;
		const name = names.get(pointer);
		return name ? require_ast.ref(name) : openapi_typescript.UNKNOWN;
	}));
	return {
		...resolved,
		decls: resolved.decls.map((decl) => ({
			...decl,
			name: names.get(decl.id) ?? decl.name
		}))
	};
};
var declare = (decl) => decl.kind === "interface" && typescript.default.isTypeLiteralNode(decl.type) ? require_ast.docs(require_ast.iface(decl.name, decl.type.members), decl.docs) : require_ast.alias(decl.name, decl.type, decl.docs);
/** One object per parameter location, in a fixed order so the output does not drift. */
var params = (route) => require_model.Route.locations.flatMap((where) => {
	const group = require_model.Route.params(route, where);
	return group.length ? [{
		name: where,
		type: require_ast.obj(group.map(field)),
		optional: group.every((p) => !p.required)
	}] : [];
});
var field = (param) => ({
	name: param.name,
	type: param.type,
	optional: !param.required,
	docs: param.docs
});
var body = (route) => route.bodies.length ? [{
	name: "body",
	type: openapi_typescript.tsUnion(route.bodies.map((b) => b.type)),
	optional: !route.bodies.some((b) => b.required)
}] : [];
var replies = (route) => route.replies.length ? [{
	name: "replies",
	type: require_ast.obj(require_model.Route.statuses(route).map(([status, group]) => ({
		name: status,
		type: openapi_typescript.tsUnion(group.map((reply) => reply.type)),
		docs: group[0]?.docs
	})))
}] : [];
/** Nests routes by `group` then `name`. Colliding names take a numeric suffix rather than vanishing. */
var tree = (routes, route) => {
	const root = /* @__PURE__ */ new Map();
	for (const r of routes) insert(root, [...r.group, require_model.Route.name(r)], {
		type: route(r),
		docs: r.docs
	});
	return members(root);
};
var insert = (branch, path, leaf) => {
	const [head, ...rest] = path;
	if (head === void 0) return;
	if (!rest.length) return void branch.set(require_model.Name.free(new Set(branch.keys()), head), leaf);
	const existing = branch.get(head);
	const child = existing instanceof Map ? existing : /* @__PURE__ */ new Map();
	branch.set(head, child);
	insert(child, rest, leaf);
};
var members = (branch) => [...branch].map(([name, node]) => node instanceof Map ? require_ast.prop({
	name,
	type: typescript.default.factory.createTypeLiteralNode(members(node))
}) : require_ast.prop({
	name,
	type: node.type,
	docs: node.docs
}));
//#endregion
exports.Emit = Emit;
exports.bind = bind;

//# sourceMappingURL=emit.cjs.map