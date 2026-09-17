const require_transport = require("../node/transport.cjs");
const require_clock = require("./clock.cjs");
//#region lib/wire/src/adapters/reconnect.ts
/**
* A node that outlives its transport. An attempt counts as successful once the transport
* delivers its first message, so the far end's greeting is what tells this it worked.
*
* @example
* ```ts
* const clock = new FakeClock()
* const node = new ReconnectNode<Frame>(connect, { clock, backoff: { base: 100 }, buffer: 8 })
*
* node.send(frame) // held while down
* clock.advance(100) // retry
* hub.add(node, { name: 'server' })
* ```
*/
var ReconnectNode = class {
	#connect;
	#options;
	#clock;
	#base;
	#max;
	#jitter;
	#timeout;
	#limit;
	#capacity;
	#held;
	#node;
	#host;
	#inner;
	#state;
	#attempts;
	#epoch;
	#wait;
	#detach;
	constructor(connect, options = {}) {
		const { base = 250, max = 3e4 } = options.backoff ?? {};
		this.#connect = connect;
		this.#options = options;
		this.#clock = options.clock ?? require_clock.systemClock;
		this.#base = base;
		this.#max = max;
		this.#jitter = Math.min(Math.max(options.jitter ?? 0, 0), 1);
		this.#timeout = options.timeout ?? 1e4;
		this.#limit = options.maxAttempts ?? 0;
		this.#capacity = options.buffer ?? 64;
		this.#held = [];
		this.#host = null;
		this.#inner = null;
		this.#state = "connecting";
		this.#attempts = 0;
		this.#epoch = 0;
		this.#wait = null;
		this.#detach = null;
		this.#node = new require_transport.TransportNode((host) => {
			this.#host = host;
			this.#attempt();
			return {
				send: (msg) => this.#write(msg),
				close: () => this.#shutdown()
			};
		}, {
			pending: options.pending,
			onError: options.onError,
			onDrop: options.onDrop
		});
	}
	send(msg) {
		return this.#node.send(msg);
	}
	listen(fn) {
		return this.#node.listen(fn);
	}
	closed(fn) {
		return this.#node.closed(fn);
	}
	close() {
		this.#node.close();
	}
	get state() {
		return this.#state;
	}
	/** Consecutive failures since the last success */
	get attempts() {
		return this.#attempts;
	}
	/** Abandons the wait and tries now, resetting backoff */
	retryNow() {
		if (this.#state === "closed" || this.#state === "open") return;
		this.#wait?.();
		this.#wait = null;
		this.#detach?.();
		this.#detach = null;
		this.#inner?.close();
		this.#inner = null;
		this.#attempts = 0;
		this.#attempt();
	}
	#write(msg) {
		if (this.#state === "closed") return false;
		if (this.#state === "open" && this.#inner) return this.#inner.send(msg);
		if (this.#capacity <= 0 || this.#held.length >= this.#capacity) {
			this.#options.onDrop?.(msg);
			return false;
		}
		this.#held.push(msg);
		return true;
	}
	#flush() {
		const live = this.#inner;
		if (!live) return;
		for (const msg of this.#held.splice(0)) live.send(msg);
	}
	#attempt() {
		if (this.#state === "closed") return;
		this.#wait?.();
		this.#wait = null;
		const token = ++this.#epoch;
		let node;
		try {
			node = this.#connect();
		} catch (err) {
			this.#report(err);
			return this.#schedule();
		}
		this.#inner = node;
		this.#setState("connecting");
		let expiry = null;
		const stops = [];
		const stop = () => {
			for (const off of stops.splice(0)) off();
			expiry?.();
			expiry = null;
		};
		const dropped = () => {
			if (token !== this.#epoch) return;
			this.#epoch += 1;
			stop();
			this.#inner = null;
			this.#schedule();
		};
		stops.push(node.listen((msg) => {
			if (token !== this.#epoch) return;
			if (this.#state !== "open") {
				expiry?.();
				expiry = null;
				this.#attempts = 0;
				this.#setState("open");
				this.#flush();
			}
			this.#host?.deliver(msg);
		}));
		stops.push(node.closed(dropped));
		if (this.#timeout > 0) expiry = this.#clock.timer(() => {
			if (token !== this.#epoch || this.#state === "open") return;
			this.#epoch += 1;
			stop();
			const dead = this.#inner;
			this.#inner = null;
			dead?.close();
			this.#report(/* @__PURE__ */ new Error(`nothing heard within ${this.#timeout}ms`));
			this.#schedule();
		}, this.#timeout);
		if (token !== this.#epoch) return stop();
		this.#detach = stop;
	}
	#schedule() {
		if (this.#state === "closed") return;
		this.#attempts += 1;
		if (this.#limit > 0 && this.#attempts >= this.#limit) {
			this.#report(/* @__PURE__ */ new Error(`giving up after ${this.#attempts} attempts`));
			return this.#shutdown();
		}
		this.#setState("retrying");
		const delay = Math.min(this.#base * 2 ** (this.#attempts - 1), this.#max);
		const spread = delay * this.#jitter;
		this.#wait = this.#clock.timer(() => this.#attempt(), Math.max(0, delay - spread + Math.random() * spread * 2));
	}
	#shutdown() {
		if (this.#state === "closed") return;
		this.#epoch += 1;
		this.#wait?.();
		this.#wait = null;
		this.#detach?.();
		this.#detach = null;
		this.#inner?.close();
		this.#inner = null;
		this.#held.length = 0;
		this.#setState("closed");
		this.#host?.shut();
	}
	#setState(next) {
		if (next === this.#state) return;
		this.#state = next;
		try {
			this.#options.onState?.(next);
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
exports.ReconnectNode = ReconnectNode;

//# sourceMappingURL=reconnect.cjs.map