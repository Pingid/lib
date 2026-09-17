import { defineNode } from "./define.js";
//#region lib/wire/src/adapters/post-message.ts
/**
* A failed clone is a bad payload, not a dead port, so it is reported rather than fatal.
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
var fromPostMessage = (target, opts = {}) => {
	const own = opts.own ?? typeof target.terminate === "function";
	return defineNode((host) => {
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
	}, opts);
};
//#endregion
export { fromPostMessage };

//# sourceMappingURL=post-message.js.map