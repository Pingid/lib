import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { toJson } from "../core/schema.js";
import "../core/index.js";
import { kebab } from "../core/text.js";
import { compile, keys, match } from "./path.js";
//#region lib/api/src/http/route.ts
var route_exports = /* @__PURE__ */ __exportAll({
	Type: () => Type,
	of: () => of
});
/**
* One method, exposed over HTTP: the binding table and nothing framework-specific.
*
* @example
* ```ts
* const get = Route.of(getRepo, { method: 'GET', path: '/orgs/:org', query: ['page'] })
* get.bindings['org'] // { source: 'path', name: 'org', array: false }
* get.match('/orgs/acme') // { org: 'acme' }
* ```
*/
var Type = class {
	node;
	method;
	path;
	bindings;
	rest;
	/** The input schema as JSON, read once — every fragment lookup goes through it. */
	json;
	compiled;
	/** Process-lifetime context, supplied by `with`. */
	context = {};
	/** Per-request context, supplied by `from`. */
	supply;
	constructor(node, spec) {
		this.node = node;
		this.method = spec.method ?? "GET";
		this.path = spec.path ?? `/${node.name}`;
		this.rest = spec.rest ?? (spec.body === true ? "body" : void 0);
		this.json = node.in ? toJson(node.in) : {};
		this.bindings = bind(this.path, spec, this.json);
	}
	/** The JSON Schema fragment for one input key, which is what decides coercion. */
	fragment(key) {
		return this.json.properties?.[key];
	}
	match(pathname) {
		this.compiled ??= compile(this.path);
		return match(this.compiled, pathname);
	}
	keys(source) {
		const out = {};
		for (const [key, binding] of Object.entries(this.bindings)) if (binding.source === source) out[key] = binding.name;
		return out;
	}
	/**
	* Values known at build time — a pool, a client. Captured is correct for these.
	*
	* @example
	* ```ts
	* Route.of(getRepo, spec).with({ db })
	* ```
	*/
	with(context) {
		this.context = {
			...this.context,
			...context
		};
		return this;
	}
	/**
	* Per-request context, read off the framework's own. `D` comes from the callback's parameter
	* annotation and lands on the adapter's handler type, so a missing decoration is reported by
	* the framework at the mount site rather than here.
	*
	* @example
	* ```ts
	* Route.of(getRepo, spec).from((c: { var: { db: Db } }) => ({ db: c.var.db }))
	* ```
	*/
	from(supply) {
		this.supply = supply;
		return this;
	}
	/**
	* Declares what the framework must provide, without supplying it. Mirrors `Cmd.context`.
	*
	* @example
	* ```ts
	* const needy = Route.of(getRepo, spec).needs<{ tenant: string }>()
	* new App().get(...Elysia.route(needy)) // error: 'tenant' is missing
	* new App().decorate('tenant', 'acme').get(...Elysia.route(needy)) // ok
	* ```
	*/
	needs() {
		return this;
	}
};
/**
* Resolve every input key to a source: explicit claims, then a fragment's own `x-in`, then
* `rest`. Anything still unclaimed is left out — the type error has already reported it, and
* inventing a source at runtime would only hide it.
*/
var bind = (path, spec, json) => {
	const bindings = {};
	const properties = json.properties ?? {};
	const claim = (source, key, name) => {
		if (key in bindings) return;
		bindings[key] = {
			source,
			name,
			array: isArray(properties[key])
		};
	};
	for (const name of keys(path)) claim("path", name, name);
	for (const source of [
		"query",
		"header",
		"cookie",
		"raw",
		"body"
	]) {
		const declared = spec[source];
		if (declared === void 0 || declared === true) continue;
		if (Array.isArray(declared)) for (const key of declared) claim(source, key, wire(source, key));
		else for (const [key, name] of Object.entries(declared)) claim(source, key, name);
	}
	for (const key of Object.keys(properties)) {
		if (key in bindings) continue;
		const declared = properties[key]?.["x-in"];
		const source = typeof declared === "string" ? declared : spec.rest ?? (spec.body === true ? "body" : void 0);
		if (source) claim(source, key, wire(source, key));
	}
	return bindings;
};
/** A header's wire name is kebab-cased; every other source uses the key as written. */
var wire = (source, key) => source === "header" ? kebab(key) : key;
var isArray = (json) => {
	if (!json) return false;
	if (json.type === "array" || Array.isArray(json.type) && json.type.includes("array")) return true;
	return (json.oneOf ?? json.anyOf)?.some((branch) => branch.type === "array") ?? false;
};
/**
* Expose a method over HTTP.
*
* Every enforced check arrives as a required property the caller cannot supply; `Check` is
* intersected only for completions. They stay out of `S`'s own constraint, which a mapped
* type keyed on `S` would make circular.
*
* @example
* ```ts
* const get = Route.of(getRepo, { method: 'GET', path: '/orgs/:org/repos/:repo', query: ['page'] })
* const create = Route.of(createRepo, { method: 'POST', path: '/orgs/:org/repos', body: true })
* ```
*/
var of = (node, spec) => new Type(node, spec);
//#endregion
export { Type, of, route_exports };

//# sourceMappingURL=route.js.map