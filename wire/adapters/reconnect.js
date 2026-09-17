import { systemClock } from "./clock.js";
import { defineNode } from "./define.js";
//#region lib/wire/src/adapters/reconnect.ts
/**
* An attempt counts as successful once the transport delivers its first message,
* so the far end's greeting is what tells this it worked.
*
* @example
* ```ts
* const clock = fakeClock()
* const node = reconnect<Frame>(connect, { clock, backoff: { base: 100 }, buffer: 8 })
*
* node.send(frame) // held while down
* clock.advance(100) // retry
* ```
*/
var reconnect = (connect, opts = {}) => {
	const { base = 250, max = 3e4 } = opts.backoff ?? {};
	const clock = opts.clock ?? systemClock;
	const jitter = Math.min(Math.max(opts.jitter ?? 0, 0), 1);
	const timeout = opts.timeout ?? 1e4;
	const limit = opts.maxAttempts ?? 0;
	const cap = opts.buffer ?? 64;
	const held = [];
	let inner = null;
	let state = "connecting";
	let fails = 0;
	let epoch = 0;
	let wait = null;
	let detach = null;
	let host;
	const report = (err) => {
		if (opts.onError) return opts.onError(err);
		queueMicrotask(() => {
			throw err;
		});
	};
	const setState = (next) => {
		if (next === state) return;
		state = next;
		try {
			opts.onState?.(next);
		} catch (err) {
			report(err);
		}
	};
	const flush = () => {
		const live = inner;
		if (!live) return;
		for (const msg of held.splice(0)) live.send(msg);
	};
	const schedule = () => {
		if (state === "closed") return;
		fails += 1;
		if (limit > 0 && fails >= limit) {
			report(/* @__PURE__ */ new Error(`giving up after ${fails} attempts`));
			return close();
		}
		setState("retrying");
		const delay = Math.min(base * 2 ** (fails - 1), max);
		const spread = delay * jitter;
		wait = clock.timer(attempt, Math.max(0, delay - spread + Math.random() * spread * 2));
	};
	function attempt() {
		if (state === "closed") return;
		wait?.();
		wait = null;
		const token = ++epoch;
		let node;
		try {
			node = connect();
		} catch (err) {
			report(err);
			return schedule();
		}
		inner = node;
		setState("connecting");
		let expiry = null;
		const stops = [];
		const stop = () => {
			for (const off of stops.splice(0)) off();
			expiry?.();
			expiry = null;
		};
		const dropped = () => {
			if (token !== epoch) return;
			epoch += 1;
			stop();
			inner = null;
			schedule();
		};
		stops.push(node.listen((msg) => {
			if (token !== epoch) return;
			if (state !== "open") {
				expiry?.();
				expiry = null;
				fails = 0;
				setState("open");
				flush();
			}
			host.deliver(msg);
		}));
		stops.push(node.closed(dropped));
		if (timeout > 0) expiry = clock.timer(() => {
			if (token !== epoch || state === "open") return;
			epoch += 1;
			stop();
			const dead = inner;
			inner = null;
			dead?.close();
			report(/* @__PURE__ */ new Error(`nothing heard within ${timeout}ms`));
			schedule();
		}, timeout);
		if (token !== epoch) return stop();
		detach = stop;
	}
	function close() {
		if (state === "closed") return;
		epoch += 1;
		wait?.();
		wait = null;
		detach?.();
		detach = null;
		inner?.close();
		inner = null;
		held.length = 0;
		setState("closed");
		host.shut();
	}
	const node = defineNode((h) => {
		host = h;
		attempt();
		return {
			send: (msg) => {
				if (state === "closed") return false;
				if (state === "open" && inner) return inner.send(msg);
				if (cap <= 0 || held.length >= cap) {
					opts.onDrop?.(msg);
					return false;
				}
				held.push(msg);
				return true;
			},
			close
		};
	}, {
		pending: opts.pending,
		onError: opts.onError,
		onDrop: opts.onDrop
	});
	return {
		send: (msg) => node.send(msg),
		listen: (fn) => node.listen(fn),
		closed: (fn) => node.closed(fn),
		close: () => node.close(),
		get state() {
			return state;
		},
		get attempts() {
			return fails;
		},
		retryNow() {
			if (state === "closed" || state === "open") return;
			wait?.();
			wait = null;
			detach?.();
			detach = null;
			inner?.close();
			inner = null;
			fails = 0;
			attempt();
		}
	};
};
//#endregion
export { reconnect };

//# sourceMappingURL=reconnect.js.map