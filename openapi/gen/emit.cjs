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
	file: (api, options = {}) => [...Emit.decls(api), Emit.routes(api, options)],
	/**
	* What a route is called with: its parameters by location, and its body. `undefined` for a
	* route that takes neither, so the builder emitted for it takes no argument.
	*/
	input: (route) => {
		const fields = [...params(route), ...body(route)];
		return fields.length ? require_ast.obj(fields) : void 0;
	},
	/**
	* A `const` of request builders, one per route, nested the same way `Emit.routes` nests
	* the types. Each is a function from the route's input to a plain object a `fetch` can take:
	*
	* ```ts
	* export const requests = {
	*   "POST /api/things/{id}": (p: { path: { id: string }; body: Thing }) => ({
	*     method: "POST",
	*     url: `/api/things/${p.path.id}`,
	*     headers: { "Content-Type": "application/json" },
	*     body: JSON.stringify(p.body),
	*   }),
	* }
	* ```
	*
	* Statements rather than one, because a route with query parameters needs the helper that
	* builds the search string; it is emitted only when something uses it.
	*/
	requests: (api, options = {}) => {
		const wanted = options.search ?? (api.routes.some((route) => require_model.Route.params(route, "query").length) && SEARCH);
		const search = wanted ? require_model.Name.free(new Set(api.decls.map((decl) => decl.name)), wanted) : false;
		const build = options.request ?? ((route) => Emit.request(route, {
			...options,
			search
		}));
		return [...search ? require_ast.source(searching(search)) : [], require_ast.constant(options.name ?? "requests", require_ast.record(render(nest(api.routes, build), entry, (name, of) => ({
			name,
			value: require_ast.record(of)
		}))))];
	},
	/** The default builder for one route: the function `Emit.requests` puts under each name. */
	request: (route, options = {}) => {
		const input = Emit.input(route);
		const sending = require_model.Route.body(route) ?? route.bodies[0];
		const headers = [];
		if (sending) headers.push({
			name: "Content-Type",
			value: require_ast.str(sending.media)
		});
		if (require_model.Route.params(route, "header").length) headers.push({ spread: require_ast.member(P, "header") });
		return require_ast.arrow(input ? [require_ast.param("p", input)] : [], require_ast.record([
			{
				name: "method",
				value: require_ast.str(route.method.toUpperCase())
			},
			{
				name: "url",
				value: require_ast.template(url(route, options))
			},
			...headers.length ? [{
				name: "headers",
				value: require_ast.record(headers)
			}] : [],
			...sending ? [{
				name: "body",
				value: payload(sending)
			}] : []
		]));
	}
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
/**
* Nests routes by `group` then `name`, carrying whatever `leaf` makes of each route.
* Colliding names take a numeric suffix rather than vanishing.
*
* Every emitter nests through here, so the type of a route and the value built for it
* always land under the same key, suffix included.
*/
var nest = (routes, leaf) => {
	const root = /* @__PURE__ */ new Map();
	for (const route of routes) insert(root, [...route.group, require_model.Route.name(route)], { leaf: leaf(route) });
	return root;
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
/** Walks a nest, building one node per leaf and one per group. */
var render = (branch, one, group) => [...branch].map(([name, node]) => node instanceof Map ? group(name, render(node, one, group)) : one(name, node.leaf));
/** The argument every emitted builder takes. */
var P = require_ast.id("p");
var SEARCH = "search";
var entry = (name, value) => ({
	name,
	value
});
/**
* The url as template parts, with each `{param}` the document declares swapped for the value
* passed in. A brace pair naming no path parameter is left as the text it is, rather than
* emitting a read that would not compile.
*/
var url = (route, options) => {
	const named = new Set(require_model.Route.params(route, "path").map((param) => param.name));
	const parts = [];
	let taken = 0;
	for (const match of route.url.matchAll(/\{([^}]+)\}/g)) {
		if (!named.has(match[1] ?? "")) continue;
		parts.push(route.url.slice(taken, match.index), require_ast.member(require_ast.member(P, "path"), match[1] ?? ""));
		taken = match.index + match[0].length;
	}
	parts.push(route.url.slice(taken));
	if (options.search && require_model.Route.params(route, "query").length) parts.push(require_ast.call(require_ast.id(options.search), [require_ast.member(P, "query")]));
	return parts;
};
/** JSON bodies go over the wire as text; anything else is handed on as it came. */
var payload = (sending) => /json/.test(sending.media) ? require_ast.call(require_ast.member(require_ast.id("JSON"), "stringify"), [require_ast.member(P, "body")]) : require_ast.member(P, "body");
var searching = (name) => `
/** Renders the query parameters as a search string, leaving off the ones not passed. */
const ${name} = (params: Record<string, unknown> | undefined): string => {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params ?? {}))
    for (const item of Array.isArray(value) ? value : [value])
      if (item !== undefined && item !== null) query.append(key, String(item))

  return query.size ? \`?\${query}\` : ''
}
`;
var tree = (routes, route) => render(nest(routes, (r) => ({
	type: route(r),
	docs: r.docs
})), (name, leaf) => require_ast.prop({
	name,
	type: leaf.type,
	docs: leaf.docs
}), (name, of) => require_ast.prop({
	name,
	type: typescript.default.factory.createTypeLiteralNode(of)
}));
//#endregion
exports.Emit = Emit;
exports.bind = bind;

//# sourceMappingURL=emit.cjs.map