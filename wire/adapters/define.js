//#region lib/wire/src/adapters/define.ts
var noop = () => {};
var report = (err, onError) => {
	if (onError) return onError(err);
	queueMicrotask(() => {
		throw err;
	});
};
/**
* `open` runs before this returns and may `shut` synchronously, so a transport
* handed over already dead yields a node whose `closed` fires on subscribe.
*
* @example
* ```ts
* const node = defineNode<Frame>((host) => {
*   const on = (event: MessageEvent) => host.deliver(event.data as Frame)
*   port.addEventListener('message', on)
*   port.start()
*   return {
*     send: (msg) => (port.postMessage(msg), true),
*     close: () => port.close(),
*     release: () => port.removeEventListener('message', on),
*   }
* })
* hub.add(node, { name: 'worker' })
* ```
*/
var defineNode = (open, opts = {}) => {
	const cap = opts.pending ?? 64;
	const sinks = /* @__PURE__ */ new Set();
	const gone = /* @__PURE__ */ new Set();
	const held = [];
	let transport = null;
	let released = false;
	let alive = true;
	const release = () => {
		if (released || !transport) return;
		released = true;
		if (transport.release) try {
			transport.release();
		} catch (err) {
			report(err, opts.onError);
		}
	};
	const shut = () => {
		if (!alive) return;
		alive = false;
		release();
		for (const fn of [...gone]) fn();
		gone.clear();
		sinks.clear();
		held.length = 0;
	};
	transport = open({
		get alive() {
			return alive;
		},
		deliver: (msg) => {
			if (!alive) return;
			if (sinks.size > 0) {
				for (const fn of [...sinks]) fn(msg);
				return;
			}
			if (cap <= 0) return void opts.onDrop?.(msg);
			while (held.length >= cap) opts.onDrop?.(held.shift());
			held.push(msg);
		},
		shut,
		fail: (err) => report(err, opts.onError)
	});
	if (!alive) release();
	return {
		send: (msg) => alive && transport !== null ? transport.send(msg) : false,
		listen: (fn) => {
			if (!alive) return noop;
			sinks.add(fn);
			for (const msg of held.splice(0)) fn(msg);
			return () => void sinks.delete(fn);
		},
		closed: (fn) => {
			if (!alive) return fn(), noop;
			gone.add(fn);
			return () => void gone.delete(fn);
		},
		close: () => {
			if (!alive) return;
			if (transport?.close) try {
				transport.close();
			} catch (err) {
				report(err, opts.onError);
			}
			shut();
		}
	};
};
//#endregion
export { defineNode };

//# sourceMappingURL=define.js.map