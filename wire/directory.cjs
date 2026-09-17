//#region lib/wire/src/directory.ts
/**
* Stamps unstamped messages, and remembers which peer each sender was last heard through.
*
* @example
* ```ts
* const who = directory<Msg>({
*   from: (msg) => msg.from ?? null,
*   stamp: (msg, id) => ({ ...msg, from: id }),
* })
* ```
*/
var directory = (opts) => {
	const tag = Math.random().toString(36).slice(2, 6);
	let seq = 0;
	const mint = opts.mint ?? (() => `${tag}-${++seq}`);
	const ids = /* @__PURE__ */ new WeakMap();
	const routes = /* @__PURE__ */ new Map();
	const changes = /* @__PURE__ */ new Set();
	const changed = () => {
		for (const fn of [...changes]) fn();
	};
	const self = (() => ({
		data: (peer, msg, next) => {
			const from = opts.from(msg);
			if (from === null) return next(opts.stamp(msg, self.id(peer)));
			if (routes.get(from) !== peer) {
				routes.set(from, peer);
				changed();
			}
			next(msg);
		},
		close: (peer) => {
			for (const [id, via] of routes) if (via === peer) routes.delete(id);
			changed();
		}
	}));
	self.id = (peer) => {
		const known = ids.get(peer);
		if (known) return known;
		const id = mint();
		ids.set(peer, id);
		routes.set(id, peer);
		return id;
	};
	self.peer = (id) => routes.get(id) ?? null;
	self.onChange = (fn) => (changes.add(fn), () => void changes.delete(fn));
	return self;
};
//#endregion
exports.directory = directory;

//# sourceMappingURL=directory.cjs.map