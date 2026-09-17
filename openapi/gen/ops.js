import { empty, pointerOf, walk } from "./ast.js";
import { Decl, Name, Pattern, Route, mapTypes } from "./model.js";
//#region lib/openapi/src/gen/ops.ts
/** Applies `ops` left to right. `Op.pipe()` is the identity. */
var pipe = (...ops) => (api) => ops.reduce((acc, op) => op(acc), api);
/**
* The combinator vocabulary. Every member is or returns an `Op`, so a pipeline is
* just a list of these handed to `generate` or `Op.pipe`.
*/
var Op = {
	pipe,
	/**
	* Narrows the pipeline to the routes that match; the rest pass through untouched.
	*
	* Inner ops may drop or add routes, but must keep `id` intact — that is how results
	* are spliced back into their original positions.
	*/
	where: (test, ...ops) => (api) => {
		const hit = predicate(test);
		const matched = api.routes.filter(hit);
		if (!matched.length) return api;
		const inner = pipe(...ops)({
			...api,
			routes: matched
		});
		const byId = new Map(inner.routes.map((route) => [route.id, route]));
		const known = new Set(matched.map((route) => route.id));
		return {
			...inner,
			routes: [...api.routes.flatMap((route) => hit(route) ? byId.get(route.id) ?? [] : route), ...inner.routes.filter((route) => !known.has(route.id))]
		};
	},
	/** Keeps the routes that match. */
	keep: (test) => (api) => ({
		...api,
		routes: api.routes.filter(predicate(test))
	}),
	/** Removes the routes that match. */
	drop: (test) => (api) => ({
		...api,
		routes: api.routes.filter((route) => !predicate(test)(route))
	}),
	/** Rewrites the request url. */
	url: (f) => onRoute((route) => ({
		...route,
		url: f(route.url, route)
	})),
	/** Pins the name the route is emitted under. Left alone it follows the url. */
	rename: (f) => onRoute((route) => ({
		...route,
		name: f(Route.name(route), route)
	})),
	/** Nests the emitted member under the returned segments. */
	group: (f) => onRoute((route) => ({
		...route,
		group: [f(route)].flat()
	})),
	/** Rewrites a route wholesale. Returning `null` drops it. */
	route: (f) => onRoute(f),
	/** Keeps the request and response bodies whose content type matches. Statuses with no content survive. */
	media: (test) => onRoute((route) => ({
		...route,
		bodies: route.bodies.filter((body) => Pattern.match(test)(body.media)),
		replies: route.replies.filter((reply) => reply.media === null || Pattern.match(test)(reply.media))
	})),
	/** Keeps the responses whose status matches: `Op.status(/^2/)` leaves only the successes. */
	status: (test) => onRoute((route) => ({
		...route,
		replies: route.replies.filter((r) => Pattern.match(test)(r.status))
	})),
	/** Rewrites parameters. Returning `null` drops one. */
	params: (f) => onRoute((route) => ({
		...route,
		params: route.params.flatMap((param) => f(param, route) ?? [])
	})),
	/** Rewrites responses. Returning `null` drops one. */
	replies: (f) => onRoute((route) => ({
		...route,
		replies: route.replies.flatMap((reply) => f(reply, route) ?? [])
	})),
	/**
	* Rewrites every type in the model: declarations, parameters, bodies and replies.
	* `at` says where the type sits, for rewrites that only apply in one place.
	*/
	types: (f) => (api) => mapTypes(api, f),
	/**
	* Adds top-level declarations, built from the model as it stands. A declaration whose
	* `id` is already in the model replaces it, so running the same op twice changes nothing.
	*
	* ```ts
	* // export interface Schemas { "Thing.Detail": ThingDetail; ... }
	* Op.declare((api) => ({
	*   id: '#/emit/Schemas',
	*   name: 'Schemas',
	*   kind: 'interface',
	*   type: Ast.obj(Decl.schemas(api).map((d) => ({ name: d.origin.name, type: Decl.ref(d) }))),
	* }))
	* ```
	*/
	declare: (f) => (api) => {
		const made = [f(api) ?? []].flat();
		const byId = new Map(made.map((decl) => [decl.id, decl]));
		const known = new Set(api.decls.map((decl) => decl.id));
		return {
			...api,
			decls: [...api.decls.map((decl) => byId.get(decl.id) ?? decl), ...made.filter((decl) => !known.has(decl.id))]
		};
	},
	/**
	* Hoists types out of the routes into their own declarations, leaving a reference behind.
	* Returning a name lifts the type; returning `null` leaves it where it is.
	*
	* ```ts
	* // export type GetThingsResponse = ...; then `200: GetThingsResponse` on the route
	* Op.extract((_type, at) =>
	*   at.in === 'reply' && at.reply.status.startsWith('2') ? `${Route.name(at.route)} Response` : null,
	* )
	* ```
	*
	* A type that is already a bare reference gets lifted too, giving an alias of an alias.
	* Check `Ast.pointerOf(type)` in the callback to leave those where they are.
	*/
	extract: (f) => (api) => {
		const made = [];
		const mapped = mapTypes(api, (type, at) => {
			if (at.in === "decl") return type;
			const name = f(type, at);
			if (name === null) return type;
			const id = Decl.at(at);
			made.push({
				id,
				name: Name.identifier(name),
				type,
				docs: Decl.docs(at),
				origin: {
					kind: "made",
					at
				}
			});
			return Decl.ref(id);
		});
		return {
			...mapped,
			decls: [...mapped.decls, ...made]
		};
	},
	/** Rewrites top-level declarations. Returning `null` drops one; references to it degrade to `unknown`. */
	decls: (f) => (api) => ({
		...api,
		decls: api.decls.flatMap((decl) => f(decl, api) ?? [])
	}),
	/**
	* Renames the declarations that came from `components.schemas`; references follow
	* automatically. Returning `null` drops one.
	*/
	schemas: (f) => Op.decls((decl) => {
		if (decl.origin?.kind !== "schema") return decl;
		const name = f(decl);
		return name === null ? null : {
			...decl,
			name: Name.identifier(name)
		};
	}),
	/**
	* Drops parameters and bodies that carry nothing, then the schemas nothing references.
	* Declarations an operator made are kept whether or not anything reaches them — they are
	* there because the pipeline asked for them. An `Op` already.
	*/
	compact: (api) => reachable(trim(api)),
	/** Orders routes and declarations by emitted name, so regenerating gives a clean diff. An `Op` already. */
	sort: (api) => ({
		decls: [...api.decls].sort(by((decl) => decl.name)),
		routes: [...api.routes].sort(by((route) => [...route.group, Route.name(route)].join("\0")))
	}),
	/** The operation's first tag, ready for `Op.group(Op.byTag)`. */
	byTag: (route) => route.tags.slice(0, 1).map(Name.identifier)
};
var onRoute = (f) => (api) => ({
	...api,
	routes: api.routes.flatMap((route) => f(route) ?? [])
});
var predicate = (test) => typeof test === "function" ? test : (route) => Pattern.match(test)(route.url);
var by = (key) => (a, b) => key(a).localeCompare(key(b));
var trim = (api) => ({
	...api,
	routes: api.routes.map((route) => ({
		...route,
		params: route.params.filter((param) => !empty(param.type)),
		bodies: route.bodies.filter((body) => !empty(body.type))
	}))
});
/** Schemas the routes or the made declarations can still reach, following references between them. */
var reachable = (api) => {
	const byId = new Map(api.decls.map((decl) => [decl.id, decl]));
	const pending = [...api.routes.flatMap(Route.types), ...Decl.made(api).map((decl) => decl.type)].flatMap(pointers);
	const seen = /* @__PURE__ */ new Set();
	for (let id = pending.pop(); id !== void 0; id = pending.pop()) {
		if (seen.has(id)) continue;
		seen.add(id);
		const decl = byId.get(id);
		if (decl) pending.push(...pointers(decl.type));
	}
	return {
		...api,
		decls: api.decls.filter((decl) => decl.origin?.kind !== "schema" || seen.has(decl.id))
	};
};
var pointers = (type) => [...walk(type)].flatMap((node) => pointerOf(node) ?? []);
//#endregion
export { Op };

//# sourceMappingURL=ops.js.map