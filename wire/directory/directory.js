//#region lib/wire/src/directory/directory.ts
/**
* Where a talker lives, learned from hearing it talk. Stamps unstamped messages, and
* remembers which peer each sender was last heard through. No wire, no id scheme.
*
* @example
* ```ts
* const who = new Directory<Frame>({
*   from: (msg) => (msg.t === 'pub' ? (msg.from ?? null) : ''),
*   stamp: (msg, id) => ({ ...msg, from: id }),
* })
* const routes = plugin<Frame>(() => ({
*   data: (peer, msg, next) => (msg.to ? void who.peer(msg.to)?.send(msg) : next(msg)),
* }))
* new Hub<Frame>([who, routes]) // who first: it stamps before routes reads
* ```
*/
var Directory = class {
	#options;
	#mint;
	#ids;
	#routes;
	#changes;
	#seq;
	constructor(options) {
		const tag = Math.random().toString(36).slice(2, 6);
		this.#options = options;
		this.#seq = 0;
		this.#mint = options.mint ?? (() => `${tag}-${++this.#seq}`);
		this.#ids = /* @__PURE__ */ new WeakMap();
		this.#routes = /* @__PURE__ */ new Map();
		this.#changes = /* @__PURE__ */ new Set();
	}
	bind(_hub) {
		return {
			data: (peer, msg, next) => {
				const from = this.#options.from(msg);
				if (from === null) return next(this.#options.stamp(msg, this.id(peer)));
				if (this.#routes.get(from) !== peer) {
					this.#routes.set(from, peer);
					this.#changed();
				}
				next(msg);
			},
			close: (peer) => {
				for (const [id, via] of this.#routes) if (via === peer) this.#routes.delete(id);
				this.#changed();
			}
		};
	}
	/** This hub's id for a peer, minted on first use */
	id(peer) {
		const known = this.#ids.get(peer);
		if (known) return known;
		const id = this.#mint();
		this.#ids.set(peer, id);
		this.#routes.set(id, peer);
		return id;
	}
	/** Who to hand something addressed to id, or null if never heard of */
	peer(id) {
		return this.#routes.get(id) ?? null;
	}
	/** The route table moved */
	onChange(fn) {
		this.#changes.add(fn);
		return () => void this.#changes.delete(fn);
	}
	#changed() {
		for (const fn of [...this.#changes]) fn();
	}
};
//#endregion
export { Directory };

//# sourceMappingURL=directory.js.map