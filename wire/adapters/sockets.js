import { defineNode } from "./define.js";
import { source } from "./source.js";
//#region lib/wire/src/adapters/sockets.ts
/**
* Events are relayed rather than offered directly, so a socket connecting before
* anything serves the source reads as "nobody was listening" instead of a crash.
*
* @example
* ```ts
* const wire = sockets<WebSocket, Frame>({ meta: (ws) => ({ name: ws.url }) })
* const stop = wire.source(hub)
*
* wss.on('connection', (ws) => {
*   wire.open(ws)
*   ws.on('message', (data) => wire.message(ws, data))
*   ws.on('close', () => wire.close(ws))
*   ws.on('error', (err) => wire.error(ws, err))
* })
* ```
*/
var sockets = (opts = {}) => {
	const encode = opts.encode ?? ((msg) => JSON.stringify(msg));
	const decode = opts.decode ?? ((data) => JSON.parse(String(data)));
	const sinks = /* @__PURE__ */ new Set();
	const emit = (event) => {
		for (const fn of [...sinks]) fn(event);
	};
	return {
		open: (socket, meta) => emit({
			kind: "open",
			socket,
			meta
		}),
		message: (socket, data) => emit({
			kind: "message",
			socket,
			data
		}),
		close: (socket) => emit({
			kind: "close",
			socket
		}),
		error: (socket, err) => emit({
			kind: "error",
			socket,
			err
		}),
		source: source((host) => {
			const hosts = /* @__PURE__ */ new WeakMap();
			const fn = (event) => {
				if (event.kind === "open") {
					const node = defineNode((h) => {
						hosts.set(event.socket, h);
						return {
							send: (msg) => {
								try {
									event.socket.send(encode(msg));
									return true;
								} catch (err) {
									h.fail(err);
									return false;
								}
							},
							close: () => void event.socket.close(),
							release: () => void (hosts.get(event.socket) === h && hosts.delete(event.socket))
						};
					}, { onError: opts.onError });
					host.offer(node, {
						...opts.meta?.(event.socket),
						...event.meta
					});
					return;
				}
				const h = hosts.get(event.socket);
				if (event.kind === "error") return (h ?? host).fail(event.err);
				if (!h) return;
				if (event.kind === "close") return h.shut();
				try {
					h.deliver(decode(event.data));
				} catch (err) {
					h.fail(err);
				}
			};
			sinks.add(fn);
			return () => void sinks.delete(fn);
		}, opts)
	};
};
//#endregion
export { sockets };

//# sourceMappingURL=sockets.js.map