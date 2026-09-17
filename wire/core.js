//#region lib/wire/src/core.ts
var noop = () => {};
var chain = (hooks, key) => {
	const fns = hooks.flatMap((h) => h[key] ? [h[key]] : []);
	if (key === "send") fns.reverse();
	return fns.reduceRight((down, fn) => (peer, msg, end) => fn(peer, msg, (out) => down(peer, out, end)), (_peer, msg, end) => end(msg));
};
/**
* Admission is a hook closing the peer; participation is a node you add.
*
* @example
* ```ts
* const gate: Plugin<Frame> = () => ({
*   open: (peer) => void (peer.meta['token'] === 'ok' || peer.close()),
* })
* const h = hub<Frame>([gate, routes])
* const here = participant(h)
* ```
*/
var hub = (plugins = [], opts = {}) => {
	const peers = /* @__PURE__ */ new Set();
	const ended = /* @__PURE__ */ new Set();
	let list = null;
	let hooks = [];
	let inward = (_peer, msg, end) => end(msg);
	let outward = (_peer, msg, end) => end(msg);
	let shut = false;
	const fail = (err) => opts.onError ? opts.onError(err) : queueMicrotask(() => {
		throw err;
	});
	const guard = (fn) => {
		try {
			fn();
		} catch (err) {
			fail(err);
		}
	};
	const drop = (peer) => {
		if (!peers.delete(peer)) return;
		list = null;
		for (const h of hooks) if (h.close) guard(() => h.close(peer));
	};
	const add = (node, meta = {}) => {
		if (shut) return node.close(), noop;
		const peer = {
			meta,
			send: (msg) => {
				if (shut) return false;
				let ok = false;
				guard(() => outward(peer, msg, (out) => void (ok = node.send(out))));
				return ok;
			},
			listen: (fn) => node.listen(fn),
			closed: (fn) => node.closed(fn),
			close: () => node.close()
		};
		peers.add(peer);
		list = null;
		const off = node.listen((msg) => guard(() => inward(peer, msg, (out) => opts.onUnhandled?.(peer, out))));
		node.closed(() => drop(peer));
		if (!peers.has(peer)) return off(), noop;
		for (const h of hooks) if (h.open) guard(() => h.open(peer));
		return () => {
			drop(peer);
			off();
			node.close();
		};
	};
	const api = {
		add,
		get peers() {
			return list ?? (list = [...peers]);
		},
		closed: (fn) => {
			if (shut) return fn(), noop;
			ended.add(fn);
			return () => void ended.delete(fn);
		},
		close: () => {
			if (shut) return;
			shut = true;
			for (const peer of [...peers]) {
				drop(peer);
				peer.close();
			}
			list = null;
			for (const fn of [...ended]) guard(fn);
			ended.clear();
		}
	};
	hooks = plugins.map((plugin) => plugin(api));
	inward = chain(hooks, "data");
	outward = chain(hooks, "send");
	return api;
};
//#endregion
export { hub };

//# sourceMappingURL=core.js.map