const require_peer = require("./peer.cjs");
//#region lib/wire/src/hub/hub.ts
/** The identity chain, used until the plugins have been bound */
function passthrough() {
	return (_peer, msg, end) => end(msg);
}
/** Folds one hook of every plugin into a single call chain */
function chain(hooks, key) {
	const fns = hooks.flatMap((hook) => hook[key] ? [hook[key]] : []);
	if (key === "send") fns.reverse();
	return fns.reduceRight((down, fn) => (peer, msg, end) => fn(peer, msg, (out) => down(peer, out, end)), passthrough());
}
var noop = () => {};
/**
* A set of peers and a hook chain. Nothing else. Admission is a hook closing the peer;
* participation is a node you add.
*
* @example
* ```ts
* const gate = plugin<Frame>(() => ({ open: (peer) => void (peer.meta['token'] === 'ok' || peer.close()) }))
* const hub = new Hub<Frame>([gate, routes])
* const here = participant(hub)
* hub.add(node, { name: 'worker' })
* ```
*/
var Hub = class {
	#options;
	#peers;
	#ended;
	#hooks;
	#inward;
	#outward;
	#list;
	#closed;
	constructor(plugins = [], options = {}) {
		this.#options = options;
		this.#peers = /* @__PURE__ */ new Set();
		this.#ended = /* @__PURE__ */ new Set();
		this.#list = null;
		this.#closed = false;
		this.#hooks = [];
		this.#inward = passthrough();
		this.#outward = passthrough();
		this.#hooks = plugins.map((plugin) => plugin.bind(this));
		this.#inward = chain(this.#hooks, "data");
		this.#outward = chain(this.#hooks, "send");
	}
	/** Takes a node as a peer. The returned Unsub removes it and closes it. */
	add(node, meta = {}) {
		if (this.#closed) return node.close(), noop;
		const peer = new require_peer.HubPeer(node, meta, (self, msg) => this.#outbound(node, self, msg));
		this.#peers.add(peer);
		this.#list = null;
		const off = node.listen((msg) => this.#guard(() => this.#inward(peer, msg, (out) => this.#options.onUnhandled?.(peer, out))));
		node.closed(() => this.#drop(peer));
		if (!this.#peers.has(peer)) return off(), noop;
		for (const hook of this.#hooks) if (hook.open) this.#guard(() => hook.open(peer));
		return () => {
			this.#drop(peer);
			off();
			node.close();
		};
	}
	/** The peers this hub is holding */
	get peers() {
		return this.#list ?? (this.#list = [...this.#peers]);
	}
	/** Subscribes to this hub closing. Fires immediately if it already has. */
	closed(fn) {
		if (this.#closed) return fn(), noop;
		this.#ended.add(fn);
		return () => void this.#ended.delete(fn);
	}
	/** Closes this hub and every peer it holds */
	close() {
		if (this.#closed) return;
		this.#closed = true;
		for (const peer of [...this.#peers]) {
			this.#drop(peer);
			peer.close();
		}
		this.#list = null;
		for (const fn of [...this.#ended]) this.#guard(fn);
		this.#ended.clear();
	}
	#outbound(node, peer, msg) {
		if (this.#closed) return false;
		let sent = false;
		this.#guard(() => this.#outward(peer, msg, (out) => void (sent = node.send(out))));
		return sent;
	}
	#drop(peer) {
		if (!this.#peers.delete(peer)) return;
		this.#list = null;
		for (const hook of this.#hooks) if (hook.close) this.#guard(() => hook.close(peer));
	}
	#guard(fn) {
		try {
			fn();
		} catch (err) {
			this.#fail(err);
		}
	}
	#fail(err) {
		if (this.#options.onError) return this.#options.onError(err);
		queueMicrotask(() => {
			throw err;
		});
	}
};
//#endregion
exports.Hub = Hub;

//# sourceMappingURL=hub.cjs.map