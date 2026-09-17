Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region lib/ship/src/index.ts
var compose = (...r) => {
	const scope = /* @__PURE__ */ new Map();
	const reg = new Registry();
	r.forEach((spec) => reg.register(spec, scope));
	return reg.resolve();
};
var Registry = class {
	resources = /* @__PURE__ */ new Map();
	async resolve() {
		const seen = /* @__PURE__ */ new Set();
		const output = {};
		while (this.resources.size > 0) {
			const b = Array.from(this.resources.entries()).flatMap(([type, m]) => Array.from(m.entries()).map(([name, p]) => {
				const key = `${type}.${name}`;
				if (seen.has(key)) return null;
				seen.add(key);
				return Promise.resolve(p).then((v) => [
					type,
					name,
					v
				]);
			}).filter((v) => v !== null));
			this.resources.clear();
			const all = await Promise.all(b);
			for (const [type, name, v] of all) {
				if (!output[`${type}s`]) output[`${type}s`] = {};
				output[`${type}s`][name] = v;
			}
		}
		return output;
	}
	register(spec, scope) {
		if (spec instanceof ContextValue) {
			spec.store(scope);
			return;
		}
		if (spec instanceof Resource) {
			const use = (r) => {
				if (r instanceof Context) {
					if (!scope.has(r)) throw new Error("Context not found");
					return scope.get(r);
				}
				if (r instanceof Resource) {
					this.register(r, scope);
					return scope.get(r);
				}
				throw new Error("Invalid ref");
			};
			const c = {
				name: spec["_name"],
				out: spec["_out"],
				use
			};
			scope.set(spec, {
				...spec["_out"] ?? {},
				name: spec["_name"]
			});
			let m = this.resources.get(spec.type);
			if (!m) this.resources.set(spec.type, m = /* @__PURE__ */ new Map());
			m.set(spec["_name"], Promise.resolve(spec["_spec"](c)));
			return;
		}
	}
};
var Resource = class Resource {
	static service(name) {
		return new Resource("service", name);
	}
	static network(name) {
		return new Resource("network", name);
	}
	static volume(name) {
		return new Resource("volume", name);
	}
	static secret(name) {
		return new Resource("secret", name);
	}
	static config(name) {
		return new Resource("config", name);
	}
	type;
	_name;
	_out;
	_spec = (_) => null;
	constructor(type, name) {
		this.type = type;
		this._name = name;
		this._spec = () => ({});
		this._out = {};
	}
	spec(spec) {
		this._spec = spec;
		return this;
	}
	out(out) {
		this._out = out;
		return this;
	}
};
var Context = class Context {
	static define() {
		return new Context();
	}
	constructor() {}
	create(value) {
		return new ContextValue(this, value);
	}
};
var ContextValue = class {
	value;
	ref;
	constructor(c, value) {
		this.ref = c;
		this.value = value;
	}
	store(s) {
		s.set(this.ref, this.value);
	}
};
//#endregion
exports.Context = Context;
exports.Resource = Resource;
exports.compose = compose;

//# sourceMappingURL=index.cjs.map