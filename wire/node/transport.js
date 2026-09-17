//#region lib/wire/src/node/transport.ts
var noop = () => {};
/**
* The bookkeeping every adapter repeats: hold inbound until someone listens, fire closed
* once, go inert afterwards. `open` runs inside this constructor and may shut synchronously,
* so a transport handed over already dead yields a node whose `closed` fires on subscribe.
*
* @example
* ```ts
* const node = new TransportNode<Frame>((host) => {
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
var TransportNode = class {
	#options;
	#pending;
	#sinks;
	#gone;
	#held;
	#host;
	#transport;
	#released;
	#alive;
	constructor(open, options = {}) {
		const self = this;
		this.#options = options;
		this.#pending = options.pending ?? 64;
		this.#sinks = /* @__PURE__ */ new Set();
		this.#gone = /* @__PURE__ */ new Set();
		this.#held = [];
		this.#transport = void 0;
		this.#released = false;
		this.#alive = true;
		this.#host = {
			get alive() {
				return self.#alive;
			},
			deliver: (msg) => this.#deliver(msg),
			shut: () => this.#shut(),
			fail: (err) => this.#report(err)
		};
		this.#transport = open(this.#host);
		if (!this.#alive) this.#release();
	}
	send(msg) {
		return this.#alive && this.#transport !== void 0 ? this.#transport.send(msg) : false;
	}
	listen(fn) {
		if (!this.#alive) return noop;
		this.#sinks.add(fn);
		for (const msg of this.#held.splice(0)) fn(msg);
		return () => void this.#sinks.delete(fn);
	}
	closed(fn) {
		if (!this.#alive) return fn(), noop;
		this.#gone.add(fn);
		return () => void this.#gone.delete(fn);
	}
	close() {
		if (!this.#alive) return;
		if (this.#transport?.close) try {
			this.#transport.close();
		} catch (err) {
			this.#report(err);
		}
		this.#shut();
	}
	#deliver(msg) {
		if (!this.#alive) return;
		if (this.#sinks.size > 0) {
			for (const fn of [...this.#sinks]) fn(msg);
			return;
		}
		if (this.#pending <= 0) return void this.#options.onDrop?.(msg);
		while (this.#held.length >= this.#pending) this.#options.onDrop?.(this.#held.shift());
		this.#held.push(msg);
	}
	#shut() {
		if (!this.#alive) return;
		this.#alive = false;
		this.#release();
		for (const fn of [...this.#gone]) fn();
		this.#gone.clear();
		this.#sinks.clear();
		this.#held.length = 0;
	}
	#release() {
		if (this.#released || this.#transport === void 0) return;
		this.#released = true;
		if (!this.#transport.release) return;
		try {
			this.#transport.release();
		} catch (err) {
			this.#report(err);
		}
	}
	#report(err) {
		if (this.#options.onError) return this.#options.onError(err);
		queueMicrotask(() => {
			throw err;
		});
	}
};
//#endregion
export { TransportNode };

//# sourceMappingURL=transport.js.map