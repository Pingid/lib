//#region lib/ship/src/v2/resource.ts
/** Compose's own top-level order, so generated files diff cleanly. */
var KINDS = [
	"service",
	"network",
	"volume",
	"secret",
	"config"
];
/**
* Brands are `Symbol.for` keys rather than classes: the CLI loads configs through jiti, which
* can hand a config its own copy of this module, and a process-global symbol is the same in
* every copy where a class identity would not be.
*/
var RESOURCE = Symbol.for("@pingid/lib/ship:Resource");
var VAR = Symbol.for("@pingid/lib/ship:Var");
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
function Var(name, ...fallback) {
	const v = Object.freeze({
		[VAR]: true,
		name,
		fallback: fallback.length > 0 ? { value: fallback[0] } : void 0,
		provide: (value) => Object.freeze({
			var: v,
			value
		})
	});
	return v;
}
//#endregion
export { Config, KINDS, Network, Secret, Service, Var, Volume, isResource };

//# sourceMappingURL=resource.js.map