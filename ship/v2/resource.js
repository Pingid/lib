import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
//#region lib/ship/src/v2/resource.ts
var resource_exports = /* @__PURE__ */ __exportAll({
	Compose: () => Compose,
	Config: () => Config,
	Network: () => Network,
	Resolve: () => Resolve,
	Secret: () => Secret,
	Service: () => Service,
	Var: () => Var,
	Volume: () => Volume
});
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
var Compose = (name, resources) => {
	let c = void 0;
	const get = () => {
		if (c === void 0) c = grouped(resources);
		return c;
	};
	return {
		name,
		[COMPOSE]: true,
		get resources() {
			return get().resources;
		},
		get services() {
			return get().groups.service;
		},
		get networks() {
			return get().groups.network;
		},
		get volumes() {
			return get().groups.volume;
		},
		get secrets() {
			return get().groups.secret;
		},
		get configs() {
			return get().groups.config;
		}
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
		get,
		$infer: void 0
	};
};
var reg;
var registry = () => {
	if (reg === void 0) reg = /* @__PURE__ */ new Map();
	return reg;
};
var isResource = (r) => RESOURCE in r && r[RESOURCE] === true;
var grouped = (resources) => {
	const flat = (typeof resources === "function" ? resources() : resources).map((r) => isResource(r) ? r : r.resources).flat();
	const groups = {};
	for (const r of flat) {
		if (!groups[r.type]) groups[r.type] = {};
		groups[r.type][r.name] = r;
	}
	return {
		resources: flat,
		...groups
	};
};
var Resolve = async (c, cx) => {
	const g = await resolve(c.resources, cx);
	return {
		name: c.name,
		...g
	};
};
var resolve = async (resource, cx) => {
	const out = {};
	for (const r of resource) if (isResource(r)) {
		if (!out[r.type]) out[r.type] = {};
		out[r.type][r.name] = await r.init({
			...cx,
			name: r.name
		});
	} else {
		const res = await resolve(r.resources, cx);
		for (const [k, v] of Object.entries(res)) {
			if (!out[k]) out[k] = {};
			for (const [n, value] of Object.entries(v)) out[k][n] = value;
		}
	}
	return out;
};
//#endregion
export { Compose, Config, Network, Resolve, Secret, Service, Var, Volume, resource_exports };

//# sourceMappingURL=resource.js.map