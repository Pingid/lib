Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let virtual__pingid_lib_vite_manifest = require("virtual:@pingid/lib/vite/manifest");
//#region lib/vite/src/virtual/client.ts
var run = (key, cb) => {
	const entry = virtual__pingid_lib_vite_manifest.mods[key];
	if (!entry) throw new Error(`[@pingid/lib/vite] no virtual module registered for "${key}"`);
	return new VirtualMod(key, entry.load, cb);
};
var VirtualMod = class {
	def = defer();
	stop = () => {};
	disposed = false;
	resolved = null;
	key;
	cb;
	constructor(key, load, cb) {
		this.key = key;
		this.cb = cb;
		const resolve = (mod) => {
			this.resolved = mod;
			this.def.resolve(this.resolved);
			return this.cb(mod);
		};
		load().then((m) => {
			if (this.disposed) return;
			this.stop = m.register((mod) => resolve(mod));
		}, (e) => this.def.reject(e instanceof Error ? e : new Error(String(e))));
	}
	then(onfulfilled = (x) => x, onrejected = console.error) {
		return this.def.promise.then(onfulfilled, onrejected);
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.stop();
		this.stop = () => {};
		if (this.resolved) return;
		this.def.reject(/* @__PURE__ */ new Error(`[@pingid/lib/vite] "${this.key}" disposed before it loaded`));
		this.def.promise.catch(() => {});
	}
	[Symbol.dispose]() {
		this.dispose();
	}
	async [Symbol.asyncDispose]() {
		if (this.disposed) return;
		await this.def.promise.catch(() => {});
		this.dispose();
	}
};
var defer = () => {
	let res;
	let rej;
	return {
		promise: new Promise((resolve, reject) => (res = resolve, rej = reject)),
		resolve: (v) => res(v),
		reject: (e) => rej(e)
	};
};
//#endregion
exports.VirtualMod = VirtualMod;
exports.defer = defer;
exports.run = run;

//# sourceMappingURL=client.cjs.map