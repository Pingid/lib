const require_brand = require("./brand.cjs");
//#region lib/ship/src/resource.ts
var RESOURCE_TYPES = [
	"service",
	"network",
	"volume",
	"secret",
	"config"
];
var RESOURCE = Symbol.for("@pingid/lib-compose:Resource");
/**
* A single compose resource.
*
* Builder methods are pure — each returns a new `Resource`. The object you pass to
* `compose()` / `stack()` / `use()` is the identity used for deduplication, so always
* pass the end of the chain.
*/
var Resource = class Resource {
	/** @see {@link branded} */
	[RESOURCE] = true;
	static [Symbol.hasInstance] = require_brand.branded(RESOURCE);
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
	_spec;
	_shared;
	constructor(type, name) {
		this.type = type;
		this._name = name;
		this._out = {};
		this._spec = () => ({});
		this._shared = void 0;
	}
	/** @internal */
	static meta(r) {
		return {
			type: r.type,
			name: r._name,
			spec: r._spec,
			shared: r._shared
		};
	}
	/** @internal The value `use()` hands back: the declared out, plus the resource key. */
	static handle(r) {
		return {
			...r._out,
			name: r._name
		};
	}
	derive(patch) {
		const next = new Resource(this.type, this._name);
		next._out = patch.out ?? this._out;
		next._spec = patch.spec ?? this._spec;
		next._shared = patch.shared ?? this._shared;
		return next;
	}
	/** Define the resource body. Call `.out()` first if the body needs to read its own handle. */
	spec(spec) {
		return this.derive({ spec });
	}
	/** Declare extra fields other resources see through `use()`. Always includes `name`. */
	out(out) {
		return this.derive({ out });
	}
	/** Layer an override on top of the existing body — environment overlays without forking. */
	patch(f) {
		const prev = this._spec;
		return this.derive({ spec: async (c) => f(await prev(c), c) });
	}
	/**
	* Pin this resource's docker object name so other stacks can reference it.
	*
	* Compose prefixes the project name onto network/volume names, so a shared object must
	* pin `name:` explicitly or the `external` reference in the consuming stack cannot be
	* reconstructed reliably. Services cannot be shared this way — they have no `name` field.
	*/
	shared(dockerName) {
		return this.derive({ shared: dockerName ?? this._name });
	}
};
//#endregion
exports.RESOURCE_TYPES = RESOURCE_TYPES;
exports.Resource = Resource;

//# sourceMappingURL=resource.cjs.map