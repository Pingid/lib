import { UNKNOWN, alias, arrow, call, constant, docs, id, iface, literal, member, obj, param, pointerOf, prop, record, ref, rewrite, source, str, template, union } from "./ast.js";
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
	file: (api, options = {}) => [...Emit.decls(api), Emit.routes(api, options)],
	/**
	* What a route is called with: its parameters by location, and its body. `undefined` for a
	* route that takes neither, so the builder emitted for it takes no argument.
	*/
	input: (route) => {
		const fields = [...params(route), ...body(route)];
		return fields.length ? obj(fields) : void 0;
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
		const wanted = options.search ?? (api.routes.some((route) => Route.params(route, "query").length) && SEARCH);
		const search = wanted ? Name.free(new Set(api.decls.map((decl) => decl.name)), wanted) : false;
		const build = options.request ?? ((route) => Emit.request(route, {
			...options,
			search
		}));
		return [...search ? source(searching(search)) : [], constant(options.name ?? "requests", record(render(nest(api.routes, build), entry, (name, of) => ({
			name,
			value: record(of)
		}))))];
	},
	/** The default builder for one route: the function `Emit.requests` puts under each name. */
	request: (route, options = {}) => {
		const input = Emit.input(route);
		const sending = Route.body(route) ?? route.bodies[0];
		const headers = [];
		if (sending) headers.push({
			name: "Content-Type",
			value: str(sending.media)
		});
		if (Route.params(route, "header").length) headers.push({ spread: member(P, "header") });
		return arrow(input ? [param("p", input)] : [], record([
			{
				name: "method",
				value: str(route.method.toUpperCase())
			},
			{
				name: "url",
				value: template(url(route, options))
			},
			...headers.length ? [{
				name: "headers",
				value: record(headers)
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
/**
* Nests routes by `group` then `name`, carrying whatever `leaf` makes of each route.
* Colliding names take a numeric suffix rather than vanishing.
*
* Every emitter nests through here, so the type of a route and the value built for it
* always land under the same key, suffix included.
*/
var nest = (routes, leaf) => {
	const root = /* @__PURE__ */ new Map();
	for (const route of routes) insert(root, [...route.group, Route.name(route)], { leaf: leaf(route) });
	return root;
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
/** Walks a nest, building one node per leaf and one per group. */
var render = (branch, one, group) => [...branch].map(([name, node]) => node instanceof Map ? group(name, render(node, one, group)) : one(name, node.leaf));
/** The argument every emitted builder takes. */
var P = id("p");
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
	const named = new Set(Route.params(route, "path").map((param) => param.name));
	const parts = [];
	let taken = 0;
	for (const match of route.url.matchAll(/\{([^}]+)\}/g)) {
		if (!named.has(match[1] ?? "")) continue;
		parts.push(route.url.slice(taken, match.index), member(member(P, "path"), match[1] ?? ""));
		taken = match.index + match[0].length;
	}
	parts.push(route.url.slice(taken));
	if (options.search && Route.params(route, "query").length) parts.push(call(id(options.search), [member(P, "query")]));
	return parts;
};
/** JSON bodies go over the wire as text; anything else is handed on as it came. */
var payload = (sending) => /json/.test(sending.media) ? call(member(id("JSON"), "stringify"), [member(P, "body")]) : member(P, "body");
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
})), (name, leaf) => prop({
	name,
	type: leaf.type,
	docs: leaf.docs
}), (name, of) => prop({
	name,
	type: ts.factory.createTypeLiteralNode(of)
}));
//#endregion
export { Emit, bind };

//# sourceMappingURL=emit.js.map