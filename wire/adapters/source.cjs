//#region lib/wire/src/adapters/source.ts
var noop = () => {};
/**
* Creates a Source that owns what it produced: the teardown stops accepting, then closes
* every node it offered.
*
* @example
* ```ts
* const spawned = source<Frame>((host) => {
*   const worker = new Worker(url)
*   host.offer(fromPostMessage(worker), { name: 'worker' })
*   host.signal.addEventListener('abort', () => worker.terminate())
* })
*
* const stop = spawned(hub)
* stop()
* ```
*/
function source(open, options = {}) {
	return (into) => {
		const offs = /* @__PURE__ */ new Set();
		const controller = new AbortController();
		let attached = null;
		let stopped = false;
		const host = {
			signal: controller.signal,
			fail: (err) => {
				if (options.onError) return options.onError(err);
				queueMicrotask(() => {
					throw err;
				});
			},
			offer: (node, meta) => {
				if (stopped) return node.close();
				const off = into.add(node, meta);
				offs.add(off);
				node.closed(() => offs.delete(off));
			}
		};
		const stop = () => {
			if (stopped) return;
			stopped = true;
			controller.abort();
			attached?.();
			for (const off of [...offs]) off();
			offs.clear();
		};
		const off = open(host);
		if (off) {
			if (stopped) off();
			else attached = off;
		}
		return stopped ? noop : stop;
	};
}
/** Creates an Adder that hands every node to each of the given adders */
function adders(...into) {
	return { add: (node, meta) => {
		const offs = into.map((one) => one.add(node, meta));
		return () => offs.forEach((off) => off());
	} };
}
//#endregion
exports.adders = adders;
exports.source = source;

//# sourceMappingURL=source.cjs.map