//#region lib/ship/src/v2/resource.ts
var RESOURCE = Symbol.for("@pingid/lib/ship:Resource");
var resorce = (type) => (name, def) => {
	const init = async () => typeof def !== "function" ? def : await def({ name });
	return {
		[RESOURCE]: true,
		type,
		name,
		init
	};
};
var Service = resorce("service");
var Network = resorce("network");
var Volume = resorce("volume");
var Secret = resorce("secret");
var Config = resorce("config");
var COMPOSE = Symbol.for("@pingid/lib/ship:Compose");
var Compose = (resources) => {
	const mapped = resources.map((r) => isResource(r) ? r : r.resources).flat();
	const groups = {};
	for (const r of mapped) {
		if (!groups[r.type]) groups[r.type] = {};
		groups[r.type][r.name] = r;
	}
	return {
		[COMPOSE]: true,
		resources: mapped,
		...groups
	};
};
var Var = (name) => {
	const provide = (value) => registry().set(name, value);
	const get = () => {
		if (registry().has(name)) return registry().get(name);
		throw new Error(`Var ${name} not found`);
	};
	return {
		name,
		provide,
		get
	};
};
var reg;
var registry = () => {
	if (reg === void 0) reg = /* @__PURE__ */ new Map();
	return reg;
};
var isResource = (r) => RESOURCE in r && r[RESOURCE] === true;
//#endregion
export { Compose, Config, Network, Secret, Service, Var, Volume };

//# sourceMappingURL=resource.js.map