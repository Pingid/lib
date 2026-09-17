import { ref } from "./ast.js";
//#region lib/openapi/src/gen/model.ts
var Methods = [
	"get",
	"put",
	"post",
	"delete",
	"options",
	"head",
	"patch",
	"trace"
];
var Locations = [
	"path",
	"query",
	"header",
	"cookie"
];
var Pattern = { 
/** `Pattern.match(/json/)('application/json')`. */
match: (pattern) => (value) => {
	if (typeof pattern === "function") return pattern(value);
	if (typeof pattern === "string") return pattern === value;
	return pattern.test(value);
} };
/**
* Reads over a route. Nothing these return is a `$ref`, which is the reason to
* come through here rather than pick `source` apart by hand.
*/
var Route = {
	/** Every HTTP method a path item can carry. */
	methods: Methods,
	/** Every place a parameter can travel. */
	locations: Locations,
	/** The name the route is emitted under. Defaults to `METHOD /url`, so rewriting the url moves the member. */
	name: (route) => route.name ?? `${route.method.toUpperCase()} ${route.url}`,
	/** Parameters, or just those in one location: `Route.params(route, 'query')`. */
	params: (route, where) => where ? route.params.filter((param) => param.in === where) : route.params,
	/** One parameter by name, whatever its location. */
	param: (route, name) => route.params.find((p) => Pattern.match(name)(p.name)),
	/** The request body for a content type. Defaults to the first JSON one. */
	body: (route, media = /json/) => route.bodies.find((body) => Pattern.match(media)(body.media)),
	/** The response for a status. Defaults to the first success. */
	reply: (route, status = /^2/) => route.replies.find((reply) => Pattern.match(status)(reply.status)),
	/** Replies grouped by status, in the order each status first appeared. */
	statuses: (route) => {
		const out = /* @__PURE__ */ new Map();
		for (const reply of route.replies) out.set(reply.status, [...out.get(reply.status) ?? [], reply]);
		return [...out];
	},
	/** Every type the route holds, in a flat list. */
	types: (route) => [
		...route.params.map((p) => p.type),
		...route.bodies.map((b) => b.type),
		...route.replies.map((r) => r.type)
	]
};
/** Reads and references over the declaration list. */
var Decl = {
	/**
	* A placeholder reference to a declaration, by value or by id. `print` swaps it for the
	* name the declaration ends up with; a pointer with nothing behind it degrades to `unknown`.
	*/
	ref: (decl) => ref(typeof decl === "string" ? decl : decl.id),
	/** One declaration by id. */
	find: (api, id) => api.decls.find((decl) => decl.id === id),
	/** The declarations that came from `components.schemas`, paired with the name the document gave them. */
	schemas: (api) => api.decls.flatMap((decl) => decl.origin?.kind === "schema" ? [{
		...decl,
		origin: decl.origin
	}] : []),
	/** The declarations an operator made, rather than the document. */
	made: (api) => api.decls.filter((decl) => decl.origin?.kind !== "schema"),
	/** The id `Op.extract` gives a type lifted out of `at`. Deterministic, so re-running gives the same id. */
	at: (at) => {
		if (at.in === "decl") return at.decl.id;
		if (at.in === "param") return `#/routes/${at.route.id}/params/${at.param.in}/${at.param.name}`;
		if (at.in === "body") return `#/routes/${at.route.id}/body/${at.body.media}`;
		return `#/routes/${at.route.id}/replies/${at.reply.status}/${at.reply.media ?? "empty"}`;
	},
	/** The description attached to whatever sits at `at`, when there is one. */
	docs: (at) => {
		if (at.in === "decl") return at.decl.docs;
		if (at.in === "param") return at.param.docs;
		if (at.in === "reply") return at.reply.docs;
	}
};
/** Narrows the OpenAPI unions, which otherwise only open up to an `in` check. */
var Is = {
	ref: (value) => !!value && typeof value === "object" && "$ref" in value && typeof value.$ref === "string",
	object: (schema) => !!schema && (typed(schema, "object") || "properties" in schema || "additionalProperties" in schema),
	array: (schema) => !!schema && (typed(schema, "array") || "items" in schema || "prefixItems" in schema),
	/** True when the schema admits `null`, however the document spells it. */
	nullable: (schema) => !!schema && (typed(schema, "null") || schema.nullable === true)
};
/** Turns arbitrary strings into names TypeScript will accept. */
var Name = {
	/** Strips a string down to a legal identifier: `Docker.Container` becomes `DockerContainer`. */
	identifier: (value) => legal(value.replace(/[^A-Za-z0-9_$]+(.)?/g, (_, next) => next?.toUpperCase() ?? "")),
	/** `GET /api/docker/{id}` becomes `GetApiDockerId`. */
	pascal: (value) => legal(words(value).map(capital).join("")),
	/** `GET /api/docker/{id}` becomes `getApiDockerId`. */
	camel: (value) => {
		const [head = "", ...rest] = words(value).map(capital);
		return legal([head.charAt(0).toLowerCase() + head.slice(1), ...rest].join(""));
	},
	/** `name` if it is free, else the first of `name_2`, `name_3`, ... that is. */
	free: (taken, name) => {
		let free = name;
		for (let n = 2; taken.has(free); n++) free = `${name}_${n}`;
		return free;
	}
};
/**
* Applies `f` to every type in the model: declarations, parameters, bodies and replies.
* `at` says which of those the type came from, so one rewrite can treat them differently.
*/
var mapTypes = (api, f) => ({
	decls: api.decls.map((decl) => ({
		...decl,
		type: f(decl.type, {
			in: "decl",
			decl
		})
	})),
	routes: api.routes.map((route) => ({
		...route,
		params: route.params.map((param) => ({
			...param,
			type: f(param.type, {
				in: "param",
				route,
				param
			})
		})),
		bodies: route.bodies.map((body) => ({
			...body,
			type: f(body.type, {
				in: "body",
				route,
				body
			})
		})),
		replies: route.replies.map((reply) => ({
			...reply,
			type: f(reply.type, {
				in: "reply",
				route,
				reply
			})
		}))
	}))
});
var typed = (schema, type) => Array.isArray(schema.type) ? schema.type.includes(type) : schema.type === type;
var words = (value) => value.split(/[^A-Za-z0-9]+/).filter(Boolean);
/** `GET` normalises to `Get`, but `listUsers` keeps the casing it was given. */
var capital = (word) => {
	const tail = word === word.toUpperCase() ? word.slice(1).toLowerCase() : word.slice(1);
	return word.charAt(0).toUpperCase() + tail;
};
var legal = (value) => /^[0-9]/.test(value) ? `_${value}` : value || "_";
//#endregion
export { Decl, Is, Name, Pattern, Route, mapTypes };

//# sourceMappingURL=model.js.map