import { toJson } from "../core/schema.js";
import "../core/index.js";
import { kebab } from "../core/text.js";
import { Path } from "./path.js";
//#region lib/api/src/http/route.ts
/**
* One method, exposed over HTTP.
*
* Holds the binding table and nothing framework-specific: the adapters are free functions in
* their own subpath modules, which is what keeps `http/index.ts` from ever reaching `elysia`
* or `hono`.
*/
var Route = class {
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
		this.compiled ??= Path.compile(this.path);
		return Path.match(this.compiled, pathname);
	}
	keys(source) {
		const out = {};
		for (const [key, binding] of Object.entries(this.bindings)) if (binding.source === source) out[key] = binding.name;
		return out;
	}
	/** Values known at build time: a pool, a client. Captured is correct for these. */
	with(context) {
		this.context = {
			...this.context,
			...context
		};
		return this;
	}
	/**
	* Per-request context, read off the framework's own.
	*
	* `D` is taken from the callback's parameter annotation and lands on the adapter's handler
	* type, so a missing decoration is reported by the framework at the `.get()` call — against
	* the app that actually has them — rather than here, where nothing knows what the app is.
	*/
	from(supply) {
		this.supply = supply;
		return this;
	}
	/** Declares what the framework must provide, without supplying it. Mirrors `Cmd.context`. */
	needs() {
		return this;
	}
};
/**
* Resolve every input key to a source.
*
* Explicit claims win, then a fragment's own `x-in` (so a schema authored with marking helpers
* works without repeating itself here), then `rest`. Anything still unclaimed is left out — the
* type error has already been reported, and inventing a source at runtime would only hide it.
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
	for (const name of Path.keys(path)) claim("path", name, name);
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
* Every check reaches the caller as a **required property it cannot supply**, whose *name* is
* the message — the compiler prints a missing property's name verbatim, so one unbound key
* gets one readable line. Nothing relies on narrowing an optional property: a violated
* optional is reported neither from `S`'s constraint nor from this intersection, whereas a
* missing required one is reported from both. `Check` is intersected here for completions, and
* is deliberately not load-bearing.
*
* The checks stay out of `S`'s own constraint, which would make it self-referential: TS calls
* a mapped type whose key depends on `S` circular as soon as `S extends …` mentions it.
*/
var route = (node, spec) => new Route(node, spec);
//#endregion
export { Route, route };

//# sourceMappingURL=route.js.map