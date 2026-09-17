import { KINDS } from "./resource.js";
import { isRef } from "./compose.js";
//#region lib/ship/src/v2/resolve.ts
/** One resolve: the vars in play, and each definition evaluated at most once per stack. */
var session = (options) => {
	const vars = new Map(options.vars?.map((b) => [b.var, b.value]));
	const cache = /* @__PURE__ */ new Map();
	const get = (v) => {
		if (vars.has(v)) return vars.get(v);
		if (v.fallback) return v.fallback.value;
		throw new Error(`var "${v.name}" was not provided`);
	};
	const evaluate = (r, project) => {
		const done = cache.get(project) ?? cache.set(project, /* @__PURE__ */ new Map()).get(project);
		if (!done.has(r)) {
			const cx = {
				name: r.name,
				project,
				build: options.build ?? false,
				get
			};
			done.set(r, (async () => typeof r.def === "function" ? r.def(cx) : r.def)());
		}
		return done.get(r);
	};
	return evaluate;
};
/**
* The stub a `Ref` leaves in the stack that uses it. Compose prefixes the project onto an
* unnamed network/volume/secret/config, so the owner's docker name is derivable without
* anyone having to pin it.
*/
var external = async (ref, evaluate) => {
	if (ref.type === "service") throw new Error(`services cannot be referenced across stacks — reach "${ref.name}" over a shared network`);
	return {
		external: true,
		name: (await evaluate(ref.resource, ref.stack.name)).name ?? `${ref.stack.name}_${ref.name}`
	};
};
var build = async (stack, evaluate) => {
	const owners = /* @__PURE__ */ new Map();
	const entries = [];
	for (const item of stack.items) {
		const r = isRef(item) ? item.resource : item;
		const key = `${item.type}.${item.name}`;
		const prev = owners.get(key);
		if (prev === r) continue;
		if (prev) throw new Error(`${stack.name}: two different resources are both ${key}`);
		owners.set(key, r);
		const value = isRef(item) ? external(item, evaluate) : evaluate(r, stack.name);
		entries.push({
			type: item.type,
			name: item.name,
			value
		});
	}
	const values = await Promise.all(entries.map(({ type, name, value }) => value.catch((cause) => {
		throw new Error(`${stack.name}: ${type}.${name}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
	})));
	const spec = {};
	for (const kind of KINDS) entries.forEach(({ type, name }, i) => {
		if (type === kind) (spec[`${kind}s`] ??= {})[name] = values[i];
	});
	return {
		name: stack.name,
		...spec
	};
};
/** One stack's compose file. */
var Resolve = (stack, options = {}) => build(stack, session(options));
/** Every stack's compose file, ordered so each comes up after the stacks it refs into. */
var Project = async (stacks, options = {}) => {
	const names = stacks.map((s) => s.name);
	const dupe = names.find((n, i) => names.indexOf(n) !== i);
	if (dupe) throw new Error(`duplicate stack "${dupe}"`);
	const edges = [];
	for (const s of stacks) {
		const reached = new Set(s.items.filter(isRef).map((r) => r.stack.name));
		for (const dependency of reached) {
			if (dependency === s.name) continue;
			if (!names.includes(dependency)) throw new Error(`stack "${s.name}" refs into "${dependency}", which is not in this project`);
			edges.push([dependency, s.name]);
		}
	}
	const evaluate = session(options);
	const specs = await Promise.all(stacks.map((s) => build(s, evaluate)));
	return {
		order: topological(names, edges),
		edges,
		specs: Object.fromEntries(specs.map((spec) => [spec.name, spec])),
		projects: Object.fromEntries(names.map((n) => [n, n]))
	};
};
/** Kahn's algorithm, stable in declaration order. */
var topological = (nodes, edges) => {
	const order = [];
	const remaining = new Set(nodes);
	while (remaining.size > 0) {
		const ready = nodes.filter((n) => remaining.has(n) && edges.every(([from, to]) => to !== n || !remaining.has(from)));
		if (ready.length === 0) throw new Error(`cycle between stacks: ${[...remaining].join(" -> ")}`);
		for (const n of ready) {
			order.push(n);
			remaining.delete(n);
		}
	}
	return order;
};
//#endregion
export { Project, Resolve };

//# sourceMappingURL=resolve.js.map