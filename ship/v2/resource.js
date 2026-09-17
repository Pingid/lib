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
//#endregion
export { Config, Network, Secret, Service, Volume };

//# sourceMappingURL=resource.js.map