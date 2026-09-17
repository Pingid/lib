const require_transport = require("../node/transport.cjs");
const require_clock = require("./clock.cjs");
//#region lib/wire/src/adapters/keepalive.ts
/**
* Liveness for transports that cannot report it — a MessagePort whose far side was
* terminated looks perfectly healthy. Symmetric: both ends ping, both answer, and any
* inbound message counts as a sign of life.
*
* @example
* ```ts
* const clock = new FakeClock()
* const node = keepalive(inner, { beat, read, interval: 1_000, timeout: 500, clock })
*
* clock.advance(1_000) // ping sent
* clock.advance(500) //   nothing came back, so node closes
* ```
*/
function keepalive(node, options) {
	const clock = options.clock ?? require_clock.systemClock;
	const interval = options.interval ?? 5e3;
	const timeout = options.timeout ?? 2e3;
	return new require_transport.TransportNode((host) => {
		let nextPing = null;
		let deadline = null;
		const alive = () => {
			deadline?.();
			deadline = null;
		};
		const ping = () => {
			node.send(options.beat("ping"));
			if (timeout > 0 && !deadline) deadline = clock.timer(() => host.shut(), timeout);
			nextPing = clock.timer(ping, interval);
		};
		const off = node.listen((msg) => {
			alive();
			const kind = options.read(msg);
			if (kind === null) return host.deliver(msg);
			if (kind === "ping") node.send(options.beat("pong"));
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
}
//#endregion
exports.keepalive = keepalive;

//# sourceMappingURL=keepalive.cjs.map