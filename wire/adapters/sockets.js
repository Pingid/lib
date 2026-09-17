import { TransportNode } from "../node/transport.js";
import { source } from "./source.js";
//#region lib/wire/src/adapters/sockets.ts
/**
* One Source for every server whose socket API is a handful of callbacks: ws, Bun, Deno, a
* plain TCP server. Events are relayed rather than offered directly, so a socket connecting
* before anything serves the source reads as "nobody was listening" instead of a crash.
*
* @example
* ```ts
* const wire = new Sockets<WebSocket, Frame>({ meta: (ws) => ({ name: ws.url }) })
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
var Sockets = class {
	#options;
	#encode;
	#decode;
	#sinks;
	#source;
	constructor(options = {}) {
		this.#options = options;
		this.#encode = options.encode ?? ((msg) => JSON.stringify(msg));
		this.#decode = options.decode ?? ((data) => JSON.parse(String(data)));
		this.#sinks = /* @__PURE__ */ new Set();
		this.#source = source((host) => {
			const hosts = /* @__PURE__ */ new WeakMap();
			const fn = (event) => {
				if (event.kind === "open") return host.offer(this.#node(event.socket, hosts), {
					...this.#options.meta?.(event.socket),
					...event.meta
				});
				const near = hosts.get(event.socket);
				if (event.kind === "error") return (near ?? host).fail(event.err);
				if (!near) return;
				if (event.kind === "close") return near.shut();
				try {
					near.deliver(this.#decode(event.data));
				} catch (err) {
					near.fail(err);
				}
			};
			this.#sinks.add(fn);
			return () => void this.#sinks.delete(fn);
		}, options);
	}
	/** A socket connected */
	open(socket, meta) {
		this.#emit({
			kind: "open",
			socket,
			meta
		});
	}
	/** A socket carried a frame */
	message(socket, data) {
		this.#emit({
			kind: "message",
			socket,
			data
		});
	}
	/** A socket hung up */
	close(socket) {
		this.#emit({
			kind: "close",
			socket
		});
	}
	/** Reported even for a socket with no node, which is what a failed upgrade looks like */
	error(socket, err) {
		this.#emit({
			kind: "error",
			socket,
			err
		});
	}
	/** The Source that turns these events into peers */
	get source() {
		return this.#source;
	}
	#node(socket, hosts) {
		return new TransportNode((host) => {
			hosts.set(socket, host);
			return {
				send: (msg) => {
					try {
						socket.send(this.#encode(msg));
						return true;
					} catch (err) {
						host.fail(err);
						return false;
					}
				},
				close: () => void socket.close(),
				release: () => void (hosts.get(socket) === host && hosts.delete(socket))
			};
		}, { onError: this.#options.onError });
	}
	#emit(event) {
		for (const fn of [...this.#sinks]) fn(event);
	}
};
//#endregion
export { Sockets };

//# sourceMappingURL=sockets.js.map