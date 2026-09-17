//#region lib/proxy/src/util.ts
var trimEnd = (p) => p.replace(/\/+$/, "");
var underPrefix = (path, prefix) => prefix !== "" && (path === prefix || path.startsWith(`${prefix}/`));
function matchesAny(patterns, value) {
	return patterns.some((p) => {
		if (typeof p === "string") return p === value;
		p.lastIndex = 0;
		return p.test(value);
	});
}
//#endregion
exports.matchesAny = matchesAny;
exports.trimEnd = trimEnd;
exports.underPrefix = underPrefix;

//# sourceMappingURL=util.cjs.map