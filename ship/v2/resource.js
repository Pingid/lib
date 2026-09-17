import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
//#region lib/ship/src/v2/resource.ts
var resource_exports = /* @__PURE__ */ __exportAll({
	Compose: () => Compose,
	Config: () => Config,
	Network: () => Network,
	Resolve: () => Resolve,
	Secret: () => Secret,
	Service: () => Service,
	Volume: () => Volume
});
/** Compose's own top-level order, so generated files read like hand-written ones. */
var KINDS = [
	"service",
	"network",
	"volume",
	"secret",
	"config"
];
/** Brands are `Symbol.for` keys so a second copy of this module (jiti, bundlers) still agrees. */
var RESOURCE = Symbol.for("@pingid/lib/ship:Resource");
var COMPOSE = Symbol.for("@pingid/lib/ship:Compose");
var isResource = (value) => typeof value === "object" && value !== null && RESOURCE in value;
var factory = (type) => (name, def = {}) => Object.freeze({
	[RESOURCE]: true,
	type,
	name,
	def
});
var Service = factory("service");
var Network = factory("network");
var Volume = factory("volume");
var Secret = factory("secret");
var Config = factory("config");
var isCompose = (value) => typeof value === "object" && value !== null && COMPOSE in value;
var Compose = (name, items) => {
	const flat = [];
	const groups = Object.fromEntries(KINDS.map((k) => [`${k}s`, {}]));
	for (const r of items.flatMap((item) => isCompose(item) ? item.items : [item])) {
		if (!isResource(r)) throw new TypeError(`${name}: expected a Resource or Compose, got ${typeof r}`);
		const group = groups[`${r.type}s`];
		if (group[r.name] === r) continue;
		if (group[r.name]) throw new Error(`${name}: two different resources are both ${r.type}.${r.name}`);
		group[r.name] = r;
		flat.push(r);
	}
	return Object.freeze({
		[COMPOSE]: true,
		name,
		items: flat,
		...groups
	});
};
/** Evaluate every definition into a plain compose file — `JSON.stringify` it and it is valid YAML. */
var Resolve = async (compose) => {
	const values = await Promise.all(compose.items.map(async (r) => {
		try {
			return typeof r.def === "function" ? await r.def({ name: r.name }) : r.def;
		} catch (cause) {
			throw new Error(`${compose.name}: ${r.type}.${r.name}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
		}
	}));
	const groups = {};
	for (const kind of KINDS) {
		const entries = compose.items.flatMap((r, i) => r.type === kind ? [[r.name, values[i]]] : []);
		if (entries.length > 0) groups[`${kind}s`] = Object.fromEntries(entries);
	}
	return {
		name: compose.name,
		...groups
	};
};
//#endregion
export { Compose, Config, Network, Resolve, Secret, Service, Volume, resource_exports };

//# sourceMappingURL=resource.js.map