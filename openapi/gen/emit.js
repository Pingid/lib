import { NEVER, NUMBER, STRING, UNKNOWN, alias, arrow, call, coalesce, collapse, constant, dict, docs, id, iface, index, intersection, literal, member, obj, param, pointerOf, prop, record, ref, rewrite, source, str, template, union, walk } from "./ast.js";
import { Media, Name, Route, mapTypes } from "./model.js";
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
	routes: (api, options = {}) => {
		const shape = {
			...options,
			events: events(api, options)
		};
		return iface(options.root ?? "Routes", tree(api.routes, options.route ?? ((r) => Emit.shape(r, shape))));
	},
	/**
	* The event type a `text/event-stream` body is wrapped in, when a route has one. `Emit.routes`
	* refers to it under the same name, so emit both or neither:
	*
	* ```ts
	* export type ServerSentEvent<T> = { data: T; event?: string; id?: string; retry?: number }
	* ```
	*/
	events: (api, options = {}) => {
		const name = events(api, options);
		return name && api.routes.some((route) => route.replies.some(streams)) ? [serverSentEvent(name)] : [];
	},
	/**
	* The default per-route type. Every field is always there, whether or not the route uses it,
	* so a client can read `p.request.query` without first asking whether this route has one:
	*
	* ```ts
	* {
	*   method: "POST";
	*   url: "/api/auth/admin/set-role";
	*   request: { body: {...}; contentType?: "application/json"; params?: never; query?: Record<string, string>; headers?: Record<string, string> };
	*   response: { 200: SetUserRole };
	*   responses: { 200: { content: { "application/json": SetUserRole }; headers: {} } };
	* }
	* ```
	*
	* `response` is the body by status, the usual read; `responses` is the whole of each response
	* the way the document lays it out, content type and headers included.
	*/
	shape: (route, options = {}) => obj([
		{
			name: "method",
			type: literal(route.method.toUpperCase())
		},
		{
			name: "url",
			type: literal(route.url)
		},
		{
			name: "request",
			type: Emit.input(route)
		},
		{
			name: "response",
			type: Emit.output(route, options)
		},
		{
			name: "responses",
			type: Emit.responses(route, options)
		}
	]),
	/** The default file: the declarations, the event type when something streams, then the routes interface. */
	file: (api, options = {}) => [
		...Emit.decls(api),
		...Emit.events(api, options),
		Emit.routes(api, options)
	],
	/**
	* What a route is called with: `body`, `contentType`, `params`, `query` and `headers`, always all five.
	*
	* A slot the document says nothing about falls back to whatever the emitted builder can
	* still do with it. Extra `query` entries are serialised and extra `headers` are spread, so
	* those stay open as `Record<string, string>`; a `params` entry the url has no placeholder
	* for and a `body` on a route that sends none would be dropped on the floor, so those close
	* to `never` rather than accepting a value that goes nowhere.
	*
	* `contentType` says which of the route's bodies is being sent. The preferred one — the first
	* JSON body, else the first — may leave it off; a route that takes several becomes a union
	* keyed on it, so the body is checked against the content type it goes out as:
	*
	* ```ts
	* { params: { id: string } } & (
	*   | { body: Thing; contentType?: "application/json" }
	*   | { body: Blob; contentType: "application/octet-stream" }
	* )
	* ```
	*/
	input: (route) => {
		const rest = [
			slot(route, "path", "params", NEVER),
			slot(route, "query", "query", dict()),
			slot(route, "header", "headers", dict()),
			...Route.params(route, "cookie").length ? [slot(route, "cookie", "cookies", NEVER)] : []
		];
		const [only, ...more] = variants(route);
		if (!more.length) return obj([...only ?? NOTHING, ...rest]);
		return intersection([obj(rest), union([only ?? NOTHING, ...more].map(obj))]);
	},
	/**
	* Each response by status the way the document lays it out: the body under each content type
	* it can come as, and the headers sent with it. A status with no content has an empty `content`.
	*
	* ```ts
	* { 200: { content: { "application/json": Thing; "text/plain": string }; headers: { ETag?: string } } }
	* ```
	*/
	responses: (route, options = {}) => obj(Route.statuses(route).map(([status, group]) => ({
		name: status,
		docs: group[0]?.docs,
		type: obj([{
			name: "content",
			type: obj(group.flatMap((r) => r.media === null ? [] : [{
				name: r.media,
				type: sent(r, options)
			}]))
		}, {
			name: "headers",
			type: obj((group[0]?.headers ?? []).map(field))
		}])
	}))),
	/**
	* What a route answers with, keyed by status. Always present, empty for a route with no replies.
	* A stream's body is typed as one event, `ServerSentEvent<Tick>`; the response is a run of them.
	*/
	output: (route, options = {}) => obj(Route.statuses(route).map(([status, group]) => ({
		name: status,
		type: collapse(union(group.map((reply) => sent(reply, options)))),
		docs: group[0]?.docs
	}))),
	/**
	* Where each route's entry sits inside the root interface: group nesting, collision suffixes
	* and all. Every emitter goes through this, so the type of a route and the value built for it
	* are always reachable at the same key.
	*/
	keys: (routes) => {
		const claimed = /* @__PURE__ */ new Map();
		const groups = /* @__PURE__ */ new Set();
		const out = /* @__PURE__ */ new Map();
		const claim = (at, name, group) => {
			const level = at.join("\0");
			const taken = claimed.get(level) ?? /* @__PURE__ */ new Set();
			claimed.set(level, taken);
			if (group && groups.has(`${level}\0${name}`)) return name;
			const free = Name.free(taken, name);
			taken.add(free);
			if (group) groups.add(`${level}\0${free}`);
			return free;
		};
		for (const route of routes) {
			const at = [];
			for (const group of route.group) at.push(claim(at, group, true));
			out.set(route.id, [...at, claim(at, Route.name(route), false)]);
		}
		return out;
	},
	/**
	* A `const` of request builders, one per route, under the same keys as the types. Each takes
	* the route's own request type — read off the emitted interface rather than spelled out again,
	* so the two cannot drift — and returns a plain object a `fetch` can take:
	*
	* ```ts
	* export const requests = {
	*   "PUT /api/db/container-config": (p: Routes["PUT /api/db/container-config"]["request"]) => ({
	*     method: "PUT",
	*     url: `/api/db/container-config${search(p.query)}`,
	*     headers: { "Content-Type": "application/json", ...p.headers },
	*     body: JSON.stringify(p.body),
	*   }),
	* }
	* ```
	*
	* Each body is encoded for its content type: JSON as text, a form as `URLSearchParams`,
	* multipart as `FormData` with no `Content-Type` of its own so the runtime can add the
	* boundary, and anything else handed on as it came. A route taking several bodies picks
	* by `contentType` at runtime.
	*
	* Statements rather than one, because the search string and the body encodings are built
	* by helpers; each is emitted only when something uses it.
	*/
	requests: (api, options = {}) => {
		const taken = new Set(api.decls.map((decl) => decl.name));
		const free = (name) => {
			const out = Name.free(taken, name);
			taken.add(out);
			return out;
		};
		const own = !options.request;
		const wanted = options.search ?? (own && api.routes.length > 0 && SEARCH);
		const search = wanted ? free(wanted) : false;
		const uses = (test) => own && api.routes.some((route) => route.bodies.length === 1 && route.bodies.some((b) => test(b.media)));
		const send = own && api.routes.some((route) => route.bodies.length > 1);
		const encoders = {
			urlEncoded: send || uses(Media.form) ? free("urlEncoded") : void 0,
			formData: send || uses(Media.multipart) ? free("formData") : void 0
		};
		if (send) encoders.send = free("send");
		const keys = Emit.keys(api.routes);
		const build = options.request ?? ((route) => Emit.request(route, {
			...options,
			search,
			encoders,
			at: keys.get(route.id)
		}));
		return [
			...search ? source(searching(search)) : [],
			...encoders.urlEncoded ? source(urlEncoding(encoders.urlEncoded)) : [],
			...encoders.formData ? source(formEncoding(encoders.formData)) : [],
			...encoders.send ? source(sending(encoders)) : [],
			constant(options.name ?? "requests", record(render(nest(api.routes, build), entry, (name, of) => ({
				name,
				value: record(of)
			}))))
		];
	},
	/** The default builder for one route: the function `Emit.requests` puts under each name. */
	request: (route, options = {}) => {
		const names = {
			...ENCODERS,
			...options.encoders
		};
		const [only, ...more] = route.bodies;
		const extra = { spread: member(P, "headers") };
		const picked = coalesce(member(P, "contentType"), str(preferred(route)?.media ?? ""));
		const sent = more.length ? [{ spread: call(id(names.send), [
			picked,
			member(P, "body"),
			member(P, "headers")
		]) }] : [{
			name: "headers",
			value: record(only && !Media.multipart(only.media) ? [{
				name: "Content-Type",
				value: str(only.media)
			}, extra] : [extra])
		}, ...only ? [{
			name: "body",
			value: payload(only, names)
		}] : []];
		return arrow([param("_p", input(route, options), { fallback: needed(route) ? void 0 : record([]) })], record([
			{
				name: "method",
				value: str(route.method.toUpperCase())
			},
			{
				name: "url",
				value: template(url(route, options))
			},
			...sent
		]));
	},
	/** The pointers left over with no declaration behind them. `print` reports these; they emit as `unknown`. */
	unresolved: (api) => {
		const known = new Set(api.decls.map((decl) => decl.id));
		const out = /* @__PURE__ */ new Set();
		for (const type of [...api.decls.map((d) => d.type), ...api.routes.flatMap(Route.types)]) for (const node of walk(type)) {
			const pointer = pointerOf(node);
			if (pointer && !known.has(pointer)) out.add(pointer);
		}
		return [...out];
	}
};
var ENCODERS = {
	urlEncoded: "urlEncoded",
	formData: "formData",
	send: "send"
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
var EVENTS = "ServerSentEvent";
/** The name the event type goes under: free of every declaration, so a schema called `ServerSentEvent` keeps its own. */
var events = (api, options) => options.events === false ? false : Name.free(new Set(api.decls.map((decl) => decl.name)), options.events ?? EVENTS);
var streams = (reply) => reply.media !== null && Media.stream(reply.media);
/** A reply's body as the route type shows it: a stream's wrapped as one event of it. */
var sent = (reply, options) => streams(reply) && options.events !== false ? ref(options.events ?? EVENTS, [reply.type]) : reply.type;
var serverSentEvent = (name) => alias(name, obj([
	{
		name: "data",
		type: ref("T"),
		docs: "The `data:` field, parsed as the document describes it."
	},
	{
		name: "event",
		type: STRING,
		optional: true,
		docs: "The `event:` field: the kind of event, `message` when the server names none."
	},
	{
		name: "id",
		type: STRING,
		optional: true,
		docs: "The `id:` field, sent back as `Last-Event-ID` on reconnect."
	},
	{
		name: "retry",
		type: NUMBER,
		optional: true,
		docs: "The `retry:` field: how long to wait before reconnecting, in milliseconds."
	}
]), "One event off a `text/event-stream` response. The body is a run of these.", ["T"]);
var declare = (decl) => {
	const docs$1 = {
		description: decl.docs,
		deprecated: decl.deprecated
	};
	return decl.kind === "interface" && ts.isTypeLiteralNode(decl.type) ? docs(iface(decl.name, decl.type.members), docs$1) : alias(decl.name, decl.type, docs$1);
};
/** One parameter location as a field, falling back to `empty` where the route declares none. */
var slot = (route, where, name, empty) => {
	const group = Route.params(route, where);
	return group.length ? {
		name,
		type: obj(group.map(field)),
		optional: group.every((p) => !p.required)
	} : {
		name,
		type: empty,
		optional: true
	};
};
var field = (param) => ({
	name: param.name,
	type: param.type,
	optional: !param.required,
	docs: {
		description: param.docs,
		deprecated: param.deprecated
	}
});
/** The body a builder sends when not told otherwise: the first JSON one, else the first. */
var preferred = (route) => route.bodies.find((b) => Media.json(b.media)) ?? route.bodies[0];
/** The `body` and `contentType` fields, one pair per body the route takes. */
var variants = (route) => {
	const fallback = preferred(route);
	const optional = !route.bodies.some((b) => b.required);
	return route.bodies.map((b) => [{
		name: "body",
		type: b.type,
		optional
	}, {
		name: "contentType",
		type: literal(b.media),
		optional: b === fallback
	}]);
};
/** A route that sends no body takes neither field. */
var NOTHING = [{
	name: "body",
	type: NEVER,
	optional: true
}, {
	name: "contentType",
	type: NEVER,
	optional: true
}];
/** Whether the route makes the caller pass anything at all. */
var needed = (route) => route.bodies.some((b) => b.required) || route.params.some((p) => p.required);
/** The builder's parameter type: read off the emitted interface when we know where it lives. */
var input = (route, options) => options.at ? index(ref(options.root ?? "Routes"), [...options.at, "request"]) : Emit.input(route);
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
var P = id("_p");
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
		parts.push(route.url.slice(taken, match.index), member(member(P, "params"), match[1] ?? ""));
		taken = match.index + match[0].length;
	}
	parts.push(route.url.slice(taken));
	if (options.search) parts.push(call(id(options.search), [member(P, "query")]));
	return parts;
};
/** JSON bodies go over the wire as text, forms and multipart through their encoders; anything else as it came. */
var payload = (sending, names) => {
	const value = member(P, "body");
	if (Media.json(sending.media)) return call(member(id("JSON"), "stringify"), [value]);
	if (Media.form(sending.media)) return call(id(names.urlEncoded), [value]);
	if (Media.multipart(sending.media)) return call(id(names.formData), [value]);
	return value;
};
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
var urlEncoding = (name) => `
/** Encodes an object as a form body, one field per entry and one per array item, leaving off the ones not passed. */
const ${name} = (value: object | undefined): URLSearchParams => {
  const form = new URLSearchParams()

  for (const [key, entry] of Object.entries(value ?? {}))
    for (const item of Array.isArray(entry) ? entry : [entry])
      if (item !== undefined && item !== null) form.append(key, String(item))

  return form
}
`;
var formEncoding = (name) => `
/** Frames an object as multipart form data: bytes as files, objects as JSON, anything else as text. */
const ${name} = (value: object | undefined): FormData => {
  const form = new FormData()

  for (const [key, entry] of Object.entries(value ?? {}))
    for (const item of Array.isArray(entry) ? entry : [entry])
      if (item instanceof Blob) form.append(key, item)
      else if (item !== undefined && item !== null)
        form.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item))

  return form
}
`;
var sending = (names) => `
/** A body encoded for the content type picked for it, with the \`Content-Type\` to send it under. Multipart sets its own. */
const ${names.send} = (type: string, body: unknown, headers?: object): { headers: Record<string, string>; body?: BodyInit } => {
  const multipart = /^multipart\\//i.test(type)
  const encoded =
    /^[^;]*[/+]json\\s*(;|$)/i.test(type) ? JSON.stringify(body)
    : /^application\\/x-www-form-urlencoded\\s*(;|$)/i.test(type) ? ${names.urlEncoded}(body as object)
    : multipart ? ${names.formData}(body as object)
    : (body as BodyInit | undefined)

  return { headers: { ...(multipart ? {} : { 'Content-Type': type }), ...(headers as Record<string, string>) }, body: encoded }
}
`;
var tree = (routes, route) => render(nest(routes, (r) => ({
	type: route(r),
	docs: {
		summary: r.summary,
		description: r.docs,
		deprecated: r.deprecated
	}
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