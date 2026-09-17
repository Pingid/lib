//#region lib/api/src/http/docs/openapi/registry.ts
/**
* Collects component schemas and rewrites inline schemas into `$ref`s.
*
* Schemas carrying `$id` or `title` always become components under that name. Others become
* components only when given a fallback name and the `refs` predicate accepts them.
*/
var createRegistry = ({ refs = true, dedupe = true } = {}, seed = {}) => {
	const on = refs !== false;
	const hoist = typeof refs === "function" ? refs : (s) => s.type === "object";
	const shared = on && dedupe;
	const schemas = { ...seed };
	const seen = new Map(Object.entries(seed).map(([name, s]) => [hash(s), name]));
	const add = (name, key, out) => {
		schemas[name] = out;
		if (shared && !seen.has(key)) seen.set(key, name);
		return ref(name);
	};
	/** Rewrite `json` into a `$ref` or an inline schema whose children are refs where possible. */
	const refer = (json, name) => {
		const key = hash(json);
		const hit = shared ? seen.get(key) : void 0;
		if (hit) return ref(hit);
		const out = walk(json);
		const id = on ? named(json) ?? (name && hoist(json) ? name : void 0) : void 0;
		return id ? add(unique(id), key, out) : out;
	};
	/** Register named models up front so later occurrences, including in each other, resolve to them. */
	const models = (record) => {
		for (const [name, json] of Object.entries(record)) if (shared) seen.set(hash(json), name);
		for (const [name, json] of Object.entries(record)) schemas[name] = walk(json);
	};
	const walk = (json) => {
		const out = {};
		for (const [k, v] of Object.entries(json)) if (k === "$schema" || k === "$id") continue;
		else if (k === "$defs" || k === "definitions") for (const [n, s] of Object.entries(v)) schemas[n] ??= refer(s);
		else if (k === "$ref") out[k] = retarget(v);
		else if (MAPS.has(k)) out[k] = Object.fromEntries(Object.entries(v).map(([n, s]) => [n, refer(s)]));
		else if (SUBS.has(k)) out[k] = Array.isArray(v) ? v.map((s) => refer(s)) : typeof v === "object" ? refer(v) : v;
		else out[k] = v;
		return out;
	};
	const unique = (id) => {
		let name = id;
		for (let i = 2; name in schemas; i++) name = `${id}${i}`;
		return name;
	};
	return {
		schemas,
		refer,
		models
	};
};
var MAPS = /* @__PURE__ */ new Set([
	"properties",
	"patternProperties",
	"dependentSchemas"
]);
var SUBS = /* @__PURE__ */ new Set([...[
	"items",
	"additionalProperties",
	"not",
	"if",
	"then",
	"else",
	"contains",
	"propertyNames"
], ...[
	"unevaluatedProperties",
	"unevaluatedItems",
	"anyOf",
	"oneOf",
	"allOf",
	"prefixItems"
]]);
var PREFIX = "#/components/schemas/";
var ref = (name) => ({ $ref: PREFIX + name });
/** Point local `$defs` refs and bare TypeBox `$id` refs at `components.schemas`. */
var retarget = (r) => /^[\w.-]+$/.test(r) ? PREFIX + r : r.replace(/^#\/(\$defs|definitions)\//, PREFIX);
var named = (json) => {
	const id = json["$id"] ?? json["title"];
	return typeof id === "string" ? pascal(id) : void 0;
};
/** Key-order independent fingerprint. Ignores symbol keys such as TypeBox's `Kind`. */
var hash = (json) => JSON.stringify(json, (k, v) => k === "$schema" ? void 0 : v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]])) : v);
var pascal = (s) => s.split(/[^a-zA-Z0-9]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
//#endregion
export { createRegistry, pascal };

//# sourceMappingURL=registry.js.map