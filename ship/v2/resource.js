//#region lib/ship/src/v2/resource.ts
var resorce = (type) => (name, def) => {
	const init = async () => typeof def !== "function" ? def : await def({ name });
	return {
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
//#endregion
export { Config, Network, Secret, Service, Var, Volume };

//# sourceMappingURL=resource.js.map