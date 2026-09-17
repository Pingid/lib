import { capture } from "./load.js";
//#region lib/ship/cli/diff.ts
/**
* Line up what compose would create against what docker has.
*
* Services are compared by compose's own config hash, the same value it uses to decide
* whether a container needs recreating — so `stale` here means `up` would replace it.
* Networks and volumes are compared by their resolved docker name, which is what makes an
* external resource, named outside the project, resolve to the object it really points at.
*/
var compare = (desired, actual) => {
	const entries = [];
	const running = /* @__PURE__ */ new Map();
	for (const container of actual.containers) {
		if (container.service.length === 0) continue;
		running.set(container.service, [...running.get(container.service) ?? [], container]);
	}
	for (const [service, hash] of Object.entries(desired.services)) {
		const containers = running.get(service) ?? [];
		const states = count(containers.map((container) => container.state));
		if (containers.length === 0) entries.push({
			kind: "service",
			name: service,
			status: "missing",
			detail: "no container"
		});
		else if (containers.some((container) => container.hash !== hash)) entries.push({
			kind: "service",
			name: service,
			status: "stale",
			detail: `${states}, config changed`
		});
		else if (containers.some((container) => container.state !== "running")) entries.push({
			kind: "service",
			name: service,
			status: "stopped",
			detail: states
		});
		else entries.push({
			kind: "service",
			name: service,
			status: "current",
			detail: states
		});
	}
	for (const [service, containers] of running) {
		if (service in desired.services) continue;
		entries.push({
			kind: "service",
			name: service,
			status: "orphan",
			detail: `${count(containers.map((container) => container.state))}, not in the config`
		});
	}
	for (const [kind, group] of [["network", "networks"], ["volume", "volumes"]]) {
		for (const resource of desired[group]) {
			const there = actual[group].has(resource.name);
			const note = resource.external ? "external" : void 0;
			if (there) entries.push({
				kind,
				name: resource.name,
				status: "current",
				detail: note
			});
			else entries.push({
				kind,
				name: resource.name,
				status: "missing",
				detail: note && `${note}, not found`
			});
		}
		const wanted = new Set(desired[group].map((resource) => resource.name));
		for (const name of actual.owned[group]) if (!wanted.has(name)) entries.push({
			kind,
			name,
			status: "orphan",
			detail: "not in the config"
		});
	}
	return entries;
};
var drifted = (entries) => entries.some((entry) => entry.status !== "current");
var SIGIL = {
	missing: "+",
	orphan: "-",
	stale: "~",
	stopped: "~",
	current: "="
};
/** Column pairs for `Render.rows`: what would change, and what docker has to say about it. */
var rows = (entries) => entries.map((entry) => [`${SIGIL[entry.status]} ${entry.kind.padEnd(7)} ${entry.name}`, entry.detail]);
/** Networks and volumes docker knows about at all, which every stack is checked against. */
var survey = async () => {
	const [networks, volumes] = await Promise.all([capture([
		"network",
		"ls",
		"--format",
		"{{.Name}}"
	]), capture([
		"volume",
		"ls",
		"--format",
		"{{.Name}}"
	])]);
	return {
		networks: new Set(names(networks)),
		volumes: new Set(names(volumes))
	};
};
/** What docker holds for one compose project, found by the labels compose stamps on it. */
var inspect = async (project, known) => {
	const label = `label=com.docker.compose.project=${project}`;
	const [containers, networks, volumes] = await Promise.all([
		capture([
			"ps",
			"-a",
			"--filter",
			label,
			"--format",
			"{{.Label \"com.docker.compose.service\"}}	{{.State}}	{{.Label \"com.docker.compose.config-hash\"}}"
		]),
		capture([
			"network",
			"ls",
			"--filter",
			label,
			"--format",
			"{{.Name}}"
		]),
		capture([
			"volume",
			"ls",
			"--filter",
			label,
			"--format",
			"{{.Name}}"
		])
	]);
	return {
		containers: records(containers).map(([service = "", state = "", hash = ""]) => ({
			service,
			state,
			hash
		})),
		networks: known.networks,
		volumes: known.volumes,
		owned: {
			networks: new Set(names(networks)),
			volumes: new Set(names(volumes))
		}
	};
};
/** Ask compose what it would make of the generated file, rather than predicting it here. */
var desired = async (spec, project, dir) => {
	const base = [
		"compose",
		"--project-name",
		project,
		"--project-directory",
		dir,
		"-f",
		"-"
	];
	const [hashes, resolved] = await Promise.all([capture([
		...base,
		"config",
		"--hash=*"
	], spec), capture([
		...base,
		"config",
		"--format",
		"json"
	], spec)]);
	const services = {};
	for (const line of names(hashes)) {
		const [service, hash] = line.split(/\s+/);
		if (service && hash) services[service] = hash;
	}
	const config = JSON.parse(resolved);
	return {
		services,
		networks: declared(config.networks),
		volumes: declared(config.volumes)
	};
};
var declared = (group = {}) => Object.entries(group).map(([key, value]) => ({
	name: value?.name ?? key,
	external: value?.external === true
}));
/** Docker's `--format` output, one record per line; a trailing empty field has to survive. */
var records = (out) => names(out).map((line) => line.split("	"));
var names = (out) => out.split("\n").map((line) => line.replace(/\r$/, "")).filter((line) => line.trim().length > 0);
/** `2 running` · `1 running, 1 exited`, in the order docker listed them. */
var count = (states) => {
	const totals = /* @__PURE__ */ new Map();
	for (const state of states) totals.set(state, (totals.get(state) ?? 0) + 1);
	return [...totals].map(([state, total]) => `${total} ${state}`).join(", ");
};
//#endregion
export { compare, desired, drifted, inspect, rows, survey };

//# sourceMappingURL=diff.js.map