import { TransportNode } from "../node/transport.js";
//#region lib/wire/src/adapters/post-message.ts
/**
* Creates a node over anything with postMessage and message events. A failed clone is a
* bad payload, not a dead port, so it is reported rather than fatal.
*
* @example
* ```ts
* // in the page
* hub.add(fromPostMessage<Frame>(new Worker('./worker.js')))
*
* // in the worker
* hub.add(fromPostMessage<Frame>(self as unknown as PostTarget))
* ```
*/
function fromPostMessage(target, options = {}) {
	const own = options.own ?? typeof target.terminate === "function";
	return new TransportNode((host) => {
		const on = (event) => host.deliver(event.data);
		target.addEventListener("message", on);
		target.start?.();
		return {
			send: (msg) => {
				try {
					target.postMessage(msg);
					return true;
				} catch (err) {
					host.fail(err);
					return false;
				}
			},
			release: () => {
				target.removeEventListener("message", on);
				if (!own) return;
				if (target.terminate) target.terminate();
				else target.close?.();
			}
		};
	}, options);
}
//#endregion
export { fromPostMessage };

//# sourceMappingURL=post-message.js.map