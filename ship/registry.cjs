const require_resource = require("./resource.cjs");
const require_context = require("./context.cjs");
//#region lib/ship/src/registry.ts
/**
* Collects resources for a single compose file.
*
* Registration is idempotent and keyed on resource identity, so a resource pulled in by
* three different services is built once. Two distinct resources claiming the same
* `type.name` is an error rather than a silent overwrite.
*/
var Registry = class {
	/** Names of other stacks this one referenced via `ref()`. */
	dependsOn = /* @__PURE__ */ new Set();
	/** The stack this registry is building, when there is one. Lets `ref()` spot a self-reference. */
	self;
	scope;
	entries = /* @__PURE__ */ new Map();
	owners = /* @__PURE__ */ new Map();
	constructor(scope) {
		this.scope = scope;
	}
	/** Register every item, context values first so `use()` never depends on argument order. */
	registerAll(items) {
		for (const item of items) if (item instanceof require_context.ContextValue) this.register(item);
		for (const item of items) if (!(item instanceof require_context.ContextValue)) this.register(item);
	}
	register(item) {
		if (item instanceof require_context.ContextValue) {
			this.scope.setContext(item.context, item.value);
			return;
		}
		if (!(item instanceof require_resource.Resource)) throw new TypeError("expected a Resource or a Context value");
		if (this.scope.hasHandle(item)) return this.scope.getHandle(item);
		const meta = require_resource.Resource.meta(item);
		const key = `${meta.type}.${meta.name}`;
		this.claim(key, item);
		const handle = require_resource.Resource.handle(item);
		this.scope.setHandle(item, handle);
		const ctx = {
			name: meta.name,
			out: handle,
			use: this.use,
			ref: this.ref
		};
		const value = (async () => {
			const definition = await meta.spec(ctx);
			return meta.shared ? {
				...definition,
				name: meta.shared
			} : definition;
		})();
		value.catch(() => {});
		this.entries.set(key, {
			type: meta.type,
			name: meta.name,
			value,
			origin: "local"
		});
		return handle;
	}
	claim(key, owner, externalName) {
		const prev = this.owners.get(key);
		if (prev === void 0) {
			this.owners.set(key, owner);
			return "claimed";
		}
		if (owner === null && prev === null && this.entries.get(key)?.externalName === externalName) return "already";
		const split = key.indexOf(".");
		const [type, name] = [key.slice(0, split), key.slice(split + 1)];
		throw new Error(`duplicate ${type} "${name}": two different resources claim the same key in one stack. Rename one, or pass the same Resource object to both places.`);
	}
	use = ((ref) => {
		if (ref instanceof require_context.Context) return this.scope.getContext(ref);
		if (ref instanceof require_resource.Resource) return this.register(ref);
		throw new TypeError("use(): expected a Context or a Resource");
	});
	ref = ((stack, target) => {
		if (!(target instanceof require_resource.Resource)) throw new TypeError("ref(): expected a Resource");
		const meta = require_resource.Resource.meta(target);
		const where = `ref(${stack?.name}, ${meta.type}.${meta.name})`;
		if (!stack || !Array.isArray(stack.items)) throw new TypeError(`${where}: expected a Stack`);
		if (!stack.items.includes(target)) throw new Error(`${where}: "${meta.name}" is not declared in stack "${stack.name}". Add it to that stack's items to export it.`);
		if (this.self && (stack === this.self || stack.name === this.self.name)) {
			this.register(target);
			return { name: meta.name };
		}
		if (meta.type === "service") throw new Error(`${where}: services cannot be shared across stacks — reach them over a shared network instead.`);
		if (!meta.shared) throw new Error(`${where}: "${meta.name}" does not pin a docker name. Compose prefixes the project name onto ${meta.type} names, so call .shared() on it in stack "${stack.name}".`);
		const key = `${meta.type}.${meta.name}`;
		if (this.claim(key, null, meta.shared) === "claimed") this.entries.set(key, {
			type: meta.type,
			name: meta.name,
			value: Promise.resolve({
				external: true,
				name: meta.shared
			}),
			origin: "external",
			externalName: meta.shared
		});
		this.dependsOn.add(stack.name);
		return { name: meta.name };
	});
	/**
	* Drain every registered resource.
	*
	* Bodies may be async and may register further resources after awaiting, so this keeps
	* draining until no new entries appear.
	*/
	async resolve() {
		const spec = {};
		const done = /* @__PURE__ */ new Set();
		for (;;) {
			const batch = [...this.entries].filter(([key]) => !done.has(key));
			if (batch.length === 0) break;
			for (const [key] of batch) done.add(key);
			const settled = await Promise.all(batch.map(([, entry]) => entry.value.then((value) => [entry, value], (cause) => {
				const message = cause instanceof Error ? cause.message : String(cause);
				throw new Error(`${entry.type}.${entry.name}: ${message}`, { cause });
			})));
			for (const [entry, value] of settled) {
				const group = spec[`${entry.type}s`] ??= {};
				group[entry.name] = value ?? null;
			}
		}
		const ordered = {};
		for (const type of require_resource.RESOURCE_TYPES) {
			const group = spec[`${type}s`];
			if (group) ordered[`${type}s`] = group;
		}
		return ordered;
	}
};
//#endregion
exports.Registry = Registry;

//# sourceMappingURL=registry.cjs.map