import { PING } from "./runtime.js";
//#region lib/vite/src/iife/client.ts
/**
* Nudges the worker registered from `url`'s script to pull the current build.
*
* `message` is a functional event, so it revives a dormant worker — which is
* why the page relaying vite's own HMR beats the worker holding a stream open:
* the browser terminates an idle worker within seconds, taking any stream with
* it. Never reached in a build.
*/
var ping = (hot) => {
	const container = globalThis.navigator?.serviceWorker;
	if (!container) return;
	container.ready.then((reg) => {
		(reg.active ?? reg.waiting ?? reg.installing)?.postMessage({ [PING]: hot });
	});
};
//#endregion
export { ping };

//# sourceMappingURL=client.js.map