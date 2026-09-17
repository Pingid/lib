//#region lib/ship/cli/validate.ts
var keysOf = (value) => value == null ? [] : Array.isArray(value) ? value.map(String) : Object.keys(value);
var isBindMount = (source) => source.startsWith(".") || source.startsWith("/") || source.startsWith("~");
/**
* The named volume a short mount string refers to, or undefined for anonymous volumes and
* bind mounts. Windows drive letters and `${VAR}` interpolation both look like a `:` separator
* or a volume name, so they are checked before splitting.
*/
var shortVolumeSource = (entry) => {
	if (/^[A-Za-z]:[\\/]/.test(entry)) return void 0;
	if (entry.includes("$")) return void 0;
	const parts = entry.split(":");
	if (parts.length < 2) return void 0;
	const source = parts[0];
	return isBindMount(source) ? void 0 : source;
};
var sourcesOf = (entries) => Array.isArray(entries) ? entries.map((e) => typeof e === "string" ? e : e?.source ?? void 0).filter((s) => typeof s === "string") : [];
/**
* Check that every reference inside a generated compose file resolves.
*
* Deliberately shallow — the shape is already type-checked. This catches the mistakes types
* cannot: a `depends_on` naming a service that was never composed, a network referenced but
* not declared, a named volume that only exists in a mount string.
*/
var validate = (spec) => {
	const problems = [];
	const services = spec.services ?? {};
	const declared = {
		service: new Set(Object.keys(services)),
		network: /* @__PURE__ */ new Set(["default", ...Object.keys(spec.networks ?? {})]),
		volume: new Set(Object.keys(spec.volumes ?? {})),
		secret: new Set(Object.keys(spec.secrets ?? {})),
		config: new Set(Object.keys(spec.configs ?? {}))
	};
	const used = {
		network: /* @__PURE__ */ new Set(),
		volume: /* @__PURE__ */ new Set(),
		secret: /* @__PURE__ */ new Set(),
		config: /* @__PURE__ */ new Set()
	};
	const require_ = (kind, name, path) => {
		used[kind].add(name);
		if (!declared[kind].has(name)) problems.push({
			level: "error",
			path,
			message: `undeclared ${kind} "${name}"`
		});
	};
	for (const [name, service] of Object.entries(services)) {
		if (service == null) continue;
		const at = `services.${name}`;
		if (!service.image && !service.build && !service.extends) problems.push({
			level: "warn",
			path: at,
			message: "has neither image nor build"
		});
		for (const dependency of keysOf(service.depends_on)) if (!declared.service.has(dependency)) problems.push({
			level: "error",
			path: `${at}.depends_on`,
			message: `undeclared service "${dependency}"`
		});
		if (!service.network_mode) for (const network of keysOf(service.networks)) require_("network", network, `${at}.networks`);
		for (const entry of service.volumes ?? []) {
			const source = typeof entry === "string" ? shortVolumeSource(entry) : (entry.type ?? "volume") === "volume" ? entry.source : void 0;
			if (source) require_("volume", source, `${at}.volumes`);
		}
		for (const source of sourcesOf(service.secrets)) require_("secret", source, `${at}.secrets`);
		for (const source of sourcesOf(service.configs)) require_("config", source, `${at}.configs`);
	}
	for (const kind of [
		"network",
		"volume",
		"secret",
		"config"
	]) for (const name of declared[kind]) {
		if (kind === "network" && name === "default") continue;
		if (!used[kind].has(name)) problems.push({
			level: "warn",
			path: `${kind}s.${name}`,
			message: "declared but never referenced"
		});
	}
	return problems;
};
var formatProblems = (problems, label) => problems.map((p) => `  ${p.level === "error" ? "error" : " warn"}  ${label ? `${label} ` : ""}${p.path}: ${p.message}`).join("\n");
//#endregion
export { formatProblems, validate };

//# sourceMappingURL=validate.js.map