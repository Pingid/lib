//#region lib/wire/src/interest/interest.ts
/**
* Who wants what, and keeping the neighbours told. Owns the index, the diff that tells
* each peer what the others want, and the cleanup. No wire, no key type.
*
* @example
* ```ts
* const wants = new Interest<Frame, string>({
*   read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
*   write: ({ key, on }) => ({ t: 'want', c: key, on }),
* })
* const routes = plugin<Frame>(() => ({
*   data: (peer, msg, next) => {
*     if (msg.t !== 'pub') return next(msg)
*     for (const to of wants.match(msg.c, peer)) to.send(msg)
*   },
* }))
* new Hub<Frame>([wants, routes])
* ```
*/
var Interest = class {
	#options;
	#hash;
	#expand;
	#byPeer;
	#byKey;
	#told;
	#wants;
	#changes;
	#hub;
	constructor(options) {
		this.#options = options;
		this.#hash = options.hash ?? ((key) => String(key));
		this.#expand = options.expand ?? ((key) => [key]);
		this.#byPeer = /* @__PURE__ */ new Map();
		this.#byKey = /* @__PURE__ */ new Map();
		this.#told = /* @__PURE__ */ new Map();
		this.#wants = /* @__PURE__ */ new Set();
		this.#changes = /* @__PURE__ */ new Set();
		this.#hub = null;
	}
	bind(hub) {
		this.#hub = hub;
		return {
			open: (peer) => this.announce(peer),
			close: (peer) => {
				this.#forget(peer);
				this.#changed();
			},
			data: (peer, msg, next) => {
				const decl = this.#options.read(msg);
				if (!decl) return next(msg);
				this.set(peer, decl.key, decl.on);
			}
		};
	}
	/** Peers wanting key, from excluded, deduplicated across expansions */
	match(key, from) {
		const out = [];
		const seen = /* @__PURE__ */ new Set();
		for (const one of this.#expand(key)) {
			const peers = this.#byKey.get(this.#hash(one));
			if (!peers) continue;
			for (const peer of peers) {
				if (peer === from || seen.has(peer)) continue;
				seen.add(peer);
				out.push(peer);
			}
		}
		return out;
	}
	/** Everything wanted by someone other than except */
	wanted(except) {
		const out = /* @__PURE__ */ new Map();
		for (const [peer, keys] of this.#byPeer) {
			if (peer === except) continue;
			for (const [id, key] of keys) out.set(id, key);
		}
		return [...out.values()];
	}
	/** Everything this one peer wants */
	of(peer) {
		return [...this.#byPeer.get(peer)?.values() ?? []];
	}
	/** Declares on a peer's behalf, for interest that never crossed a wire */
	set(peer, key, on) {
		const id = this.#hash(key);
		const keys = this.#byPeer.get(peer) ?? /* @__PURE__ */ new Map();
		this.#byPeer.set(peer, keys);
		if (on) {
			if (keys.has(id)) return;
			keys.set(id, key);
			const peers = this.#byKey.get(id) ?? /* @__PURE__ */ new Set();
			this.#byKey.set(id, peers);
			peers.add(peer);
			for (const fn of [...this.#wants]) fn(peer, key);
		} else {
			if (!keys.delete(id)) return;
			const peers = this.#byKey.get(id);
			peers?.delete(peer);
			if (peers?.size === 0) this.#byKey.delete(id);
			if (keys.size === 0) this.#byPeer.delete(peer);
		}
		this.#changed();
	}
	/** Re-sends the whole set to a peer. Call it when the peer says hello again. */
	announce(peer) {
		this.#told.delete(peer);
		this.#sync();
	}
	/** A peer newly wants a key. Where replaying retained state belongs. */
	onWant(fn) {
		this.#wants.add(fn);
		return () => void this.#wants.delete(fn);
	}
	/** The table moved */
	onChange(fn) {
		this.#changes.add(fn);
		return () => void this.#changes.delete(fn);
	}
	/** Tells every peer the union of what the others want, as a diff */
	#sync() {
		if (this.#hub === null) return;
		for (const peer of this.#hub.peers) {
			const want = /* @__PURE__ */ new Map();
			for (const [other, keys] of this.#byPeer) {
				if (other === peer) continue;
				for (const [id, key] of keys) want.set(id, key);
			}
			const have = this.#told.get(peer) ?? /* @__PURE__ */ new Map();
			for (const [id, key] of want) if (!have.has(id)) peer.send(this.#options.write({
				key,
				on: true
			}));
			for (const [id, key] of have) if (!want.has(id)) peer.send(this.#options.write({
				key,
				on: false
			}));
			this.#told.set(peer, want);
		}
	}
	#changed() {
		this.#sync();
		for (const fn of [...this.#changes]) fn();
	}
	#forget(peer) {
		const keys = this.#byPeer.get(peer);
		this.#byPeer.delete(peer);
		this.#told.delete(peer);
		if (!keys) return;
		for (const id of keys.keys()) {
			const peers = this.#byKey.get(id);
			peers?.delete(peer);
			if (peers?.size === 0) this.#byKey.delete(id);
		}
	}
};
//#endregion
exports.Interest = Interest;

//# sourceMappingURL=interest.cjs.map