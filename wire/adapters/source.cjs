//#region lib/wire/src/adapters/source.ts
var noop = () => {};
/**
* Owns what it produced: the teardown stops accepting, then closes every node it offered.
*
* @example
* ```ts
* const spawned: Source<Frame> = source((host) => {
*   const worker = new Worker(url)
*   host.offer(fromWorker(worker), { name: 'worker' })
*   host.signal.addEventListener('abort', () => worker.terminate())
* })
*
* const stop = spawned(hub)
* stop()
* ```
*/
var source = (open, opts = {}) => {
	return (into) => {
		const offs = /* @__PURE__ */ new Set();
		const ac = new AbortController();
		let attached = null;
		let stopped = false;
		const host = {
			signal: ac.signal,
			fail: (err) => {
				if (opts.onError) return opts.onError(err);
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
			ac.abort();
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
};
//#endregion
exports.source = source;

//# sourceMappingURL=source.cjs.map