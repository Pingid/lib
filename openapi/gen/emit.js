import { UNKNOWN, alias, docs, iface, literal, obj, pointerOf, prop, ref, rewrite, union } from "./ast.js";
import { Name, Route, mapTypes } from "./model.js";
import ts from "typescript";
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
	routes: (api, options = {}) => iface(options.root ?? "Routes", tree(api.routes, options.route ?? Emit.shape)),
	/** The default per-route type: enough to drive a typed client with no further work. */
	shape: (route) => obj([
		{
			name: "method",
			type: literal(route.method.toUpperCase())
		},
		{
			name: "url",
			type: literal(route.url)
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
		const name = Name.free(taken, Name.identifier(decl.name));
		taken.add(name);
		names.set(decl.id, name);
	}
	const resolved = mapTypes(api, (type) => rewrite(type, (node) => {
		const pointer = pointerOf(node);
		if (!pointer) return node;
		const name = names.get(pointer);
		return name ? ref(name) : UNKNOWN;
	}));
	return {
		...resolved,
		decls: resolved.decls.map((decl) => ({
			...decl,
			name: names.get(decl.id) ?? decl.name
		}))
	};
};
var declare = (decl) => decl.kind === "interface" && ts.isTypeLiteralNode(decl.type) ? docs(iface(decl.name, decl.type.members), decl.docs) : alias(decl.name, decl.type, decl.docs);
/** One object per parameter location, in a fixed order so the output does not drift. */
var params = (route) => Route.locations.flatMap((where) => {
	const group = Route.params(route, where);
	return group.length ? [{
		name: where,
		type: obj(group.map(field)),
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
	type: union(route.bodies.map((b) => b.type)),
	optional: !route.bodies.some((b) => b.required)
}] : [];
var replies = (route) => route.replies.length ? [{
	name: "replies",
	type: obj(Route.statuses(route).map(([status, group]) => ({
		name: status,
		type: union(group.map((reply) => reply.type)),
		docs: group[0]?.docs
	})))
}] : [];
/** Nests routes by `group` then `name`. Colliding names take a numeric suffix rather than vanishing. */
var tree = (routes, route) => {
	const root = /* @__PURE__ */ new Map();
	for (const r of routes) insert(root, [...r.group, Route.name(r)], {
		type: route(r),
		docs: r.docs
	});
	return members(root);
};
var insert = (branch, path, leaf) => {
	const [head, ...rest] = path;
	if (head === void 0) return;
	if (!rest.length) return void branch.set(Name.free(new Set(branch.keys()), head), leaf);
	const existing = branch.get(head);
	const child = existing instanceof Map ? existing : /* @__PURE__ */ new Map();
	branch.set(head, child);
	insert(child, rest, leaf);
};
var members = (branch) => [...branch].map(([name, node]) => node instanceof Map ? prop({
	name,
	type: ts.factory.createTypeLiteralNode(members(node))
}) : prop({
	name,
	type: node.type,
	docs: node.docs
}));
//#endregion
export { Emit, bind };

//# sourceMappingURL=emit.js.map