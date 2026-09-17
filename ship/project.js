import { ContextValue } from "./context.js";
import { Scope } from "./scope.js";
import { Registry } from "./registry.js";
import { Stack } from "./stack.js";
//#region lib/ship/src/project.ts
var Project = class Project {
	/** Stack names in dependency order — dependencies first. */
	order = [];
	/** `[dependency, dependent]` pairs discovered through `ref()`. */
	edges = [];
	/** Generated compose file per stack name. */
	specs = {};
	/** Docker project name per stack name. */
	projects = {};
	constructor(order, edges, specs, projects) {
		this.order = order;
		this.edges = edges;
		this.specs = specs;
		this.projects = projects;
	}
	/**
	* Build every stack in a project.
	*
	* Top-level context values are visible to all stacks; a stack may also declare its own.
	* Cross-stack `ref()` calls are collected into a dependency order for the CLI to bring
	* stacks up in (and down in reverse).
	*/
	static async build(...entries) {
		const root = new Scope();
		const stacks = [];
		for (const entry of entries) if (entry instanceof ContextValue) root.setContext(entry.context, entry.value);
		else if (entry instanceof Stack) stacks.push(entry);
		else throw new TypeError("project(): expected a Stack or a Context value");
		const seen = /* @__PURE__ */ new Set();
		for (const s of stacks) {
			if (seen.has(s.name)) throw new Error(`duplicate stack "${s.name}"`);
			seen.add(s.name);
		}
		const specs = {};
		const projects = {};
		const edges = [];
		for (const s of stacks) {
			const registry = new Registry(root.child());
			registry.self = s;
			registry.registerAll(s.items);
			const spec = {
				name: s.project,
				...await registry.resolve()
			};
			specs[s.name] = spec;
			projects[s.name] = s.project;
			for (const dependency of registry.dependsOn) {
				if (dependency === s.name) continue;
				if (!seen.has(dependency)) throw new Error(`stack "${s.name}" references stack "${dependency}", which is not part of this project`);
				edges.push([dependency, s.name]);
			}
		}
		return new Project(topological(stacks.map((s) => s.name), edges), edges, specs, projects);
	}
};
/** Kahn's algorithm, stable in declaration order. */
var topological = (nodes, edges) => {
	const incoming = new Map(nodes.map((n) => [n, /* @__PURE__ */ new Set()]));
	for (const [from, to] of edges) incoming.get(to)?.add(from);
	const order = [];
	const remaining = new Set(nodes);
	while (remaining.size > 0) {
		const ready = nodes.filter((n) => remaining.has(n) && [...incoming.get(n)].every((d) => !remaining.has(d)));
		if (ready.length === 0) throw new Error(`cycle between stacks: ${[...remaining].join(" -> ")}`);
		for (const n of ready) {
			order.push(n);
			remaining.delete(n);
		}
	}
	return order;
};
//#endregion
export { Project };

//# sourceMappingURL=project.js.map