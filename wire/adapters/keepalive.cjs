const require_clock = require("./clock.cjs");
const require_define = require("./define.cjs");
//#region lib/wire/src/adapters/keepalive.ts
/**
* Symmetric: both ends ping, both answer, and any inbound message counts as a sign of life.
*
* @example
* ```ts
* const clock = fakeClock()
* const node = keepalive(inner, { beat, read, interval: 1_000, timeout: 500, clock })
*
* clock.advance(1_000) // ping sent
* clock.advance(500) //   nothing came back, so `node` closes
* ```
*/
var keepalive = (node, opts) => {
	const clock = opts.clock ?? require_clock.systemClock;
	const interval = opts.interval ?? 5e3;
	const timeout = opts.timeout ?? 2e3;
	return require_define.defineNode((host) => {
		let nextPing = null;
		let deadline = null;
		const alive = () => {
			deadline?.();
			deadline = null;
		};
		const ping = () => {
			node.send(opts.beat("ping"));
			if (timeout > 0 && !deadline) deadline = clock.timer(() => host.shut(), timeout);
			nextPing = clock.timer(ping, interval);
		};
		const off = node.listen((msg) => {
			alive();
			const kind = opts.read(msg);
			if (kind === null) return host.deliver(msg);
			if (kind === "ping") node.send(opts.beat("pong"));
		});
		const offClosed = node.closed(() => host.shut());
		if (interval > 0) nextPing = clock.timer(ping, interval);
		return {
			send: (msg) => node.send(msg),
			close: () => node.close(),
			release: () => {
				nextPing?.();
				deadline?.();
				off();
				offClosed();
			}
		};
	});
};
//#endregion
exports.keepalive = keepalive;

//# sourceMappingURL=keepalive.cjs.map