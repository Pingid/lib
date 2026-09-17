//#region lib/wire/src/interest.ts
/**
* Owns the index, the diff that tells each peer what the others want, and the cleanup.
*
* @example
* ```ts
* const wants = interest<Frame, string>({
*   read: (msg) => (msg.t === 'want' ? { key: msg.c, on: msg.on } : null),
*   write: ({ key, on }) => ({ t: 'want', c: key, on }),
* })
* ```
*/
var interest = (opts) => {
	const hash = opts.hash ?? ((key) => String(key));
	const expand = opts.expand ?? ((key) => [key]);
	const byPeer = /* @__PURE__ */ new Map();
	const byKey = /* @__PURE__ */ new Map();
	const told = /* @__PURE__ */ new Map();
	const wants = /* @__PURE__ */ new Set();
	const changes = /* @__PURE__ */ new Set();
	let hub;
	const changed = () => {
		sync();
		for (const fn of [...changes]) fn();
	};
	const sync = () => {
		for (const peer of hub.peers) {
			const want = /* @__PURE__ */ new Map();
			for (const [other, keys] of byPeer) {
				if (other === peer) continue;
				for (const [id, key] of keys) want.set(id, key);
			}
			const have = told.get(peer) ?? /* @__PURE__ */ new Map();
			for (const [id, key] of want) if (!have.has(id)) peer.send(opts.write({
				key,
				on: true
			}));
			for (const [id, key] of have) if (!want.has(id)) peer.send(opts.write({
				key,
				on: false
			}));
			told.set(peer, want);
		}
	};
	const set = (peer, key, on) => {
		const id = hash(key);
		const keys = byPeer.get(peer) ?? /* @__PURE__ */ new Map();
		byPeer.set(peer, keys);
		if (on) {
			if (keys.has(id)) return;
			keys.set(id, key);
			const peers = byKey.get(id) ?? /* @__PURE__ */ new Set();
			byKey.set(id, peers);
			peers.add(peer);
			for (const fn of [...wants]) fn(peer, key);
		} else {
			if (!keys.delete(id)) return;
			const peers = byKey.get(id);
			peers?.delete(peer);
			if (peers?.size === 0) byKey.delete(id);
			if (keys.size === 0) byPeer.delete(peer);
		}
		changed();
	};
	const forget = (peer) => {
		const keys = byPeer.get(peer);
		byPeer.delete(peer);
		told.delete(peer);
		if (!keys) return;
		for (const id of keys.keys()) {
			const peers = byKey.get(id);
			peers?.delete(peer);
			if (peers?.size === 0) byKey.delete(id);
		}
	};
	const self = ((h) => {
		hub = h;
		return {
			open: (peer) => self.announce(peer),
			close: (peer) => {
				forget(peer);
				changed();
			},
			data: (peer, msg, next) => {
				const decl = opts.read(msg);
				if (!decl) return next(msg);
				set(peer, decl.key, decl.on);
			}
		};
	});
	self.match = (key, from) => {
		const out = [];
		const seen = /* @__PURE__ */ new Set();
		for (const one of expand(key)) {
			const peers = byKey.get(hash(one));
			if (!peers) continue;
			for (const peer of peers) {
				if (peer === from || seen.has(peer)) continue;
				seen.add(peer);
				out.push(peer);
			}
		}
		return out;
	};
	self.set = set;
	self.wanted = (except) => {
		const out = /* @__PURE__ */ new Map();
		for (const [peer, keys] of byPeer) {
			if (peer === except) continue;
			for (const [id, key] of keys) out.set(id, key);
		}
		return [...out.values()];
	};
	self.of = (peer) => [...byPeer.get(peer)?.values() ?? []];
	self.announce = (peer) => {
		told.delete(peer);
		sync();
	};
	self.onWant = (fn) => (wants.add(fn), () => void wants.delete(fn));
	self.onChange = (fn) => (changes.add(fn), () => void changes.delete(fn));
	return self;
};
//#endregion
export { interest };

//# sourceMappingURL=interest.js.map