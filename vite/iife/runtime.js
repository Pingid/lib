import { create } from "../virtual/runtime.js";
//#region lib/vite/src/iife/runtime.ts
/** Marks a `postMessage` from the page as a hot-reload nudge for `url`. */
var PING = "__pingid_iife_ping";
/**
* Runs the entry's setup. `mod` is inlined by the shell build, so this happens
* during the script's initial evaluation — that timing is what lets a service
* worker claim functional events like `fetch`, which the browser decides at
* install time.
*/
var start = (mod) => {
	const { register, accept } = create(mod);
	register((m) => guard(() => m.default?.()));
	return accept;
};
/** What a build's shell calls: setup runs once, there is nothing to swap. */
var boot = (mod) => void start(mod);
/**
* What a dev shell calls. Split from {@link boot} rather than branching on a
* parameter so the transport below — `new Function` included — is simply absent
* from a build, instead of shipped as unreachable code esbuild can't prove dead.
*
* `hot` serves the entry bundled on its own.
*/
var bootHot = (mod, hot) => {
	const accept = start(mod);
	let running = null;
	let again = false;
	const pull = async () => {
		const res = await fetch(hot, { cache: "no-store" });
		if (!res.ok) throw new Error(`${res.status} from ${hot}`);
		const mod_ = new Function(await res.text())();
		if (mod_) accept({ mod: mod_ });
	};
	/**
	* Coalesces concurrent nudges — every open tab relays the same edit — while
	* still making a second pass when one arrives mid-flight, so the newest build
	* is never the one that got dropped.
	*/
	const swap = () => {
		if (running) return void (again = true);
		running = pull().catch((e) => console.error("[pingid:iife] hot update failed", e)).finally(() => {
			running = null;
			if (again) again = false, swap();
		});
	};
	swap();
	addEventListener("message", (event) => {
		const data = event.data;
		if (data && data["__pingid_iife_ping"] === hot) swap();
	});
};
/** One throwing setup shouldn't leave the script detached-but-not-attached. */
var guard = (fn) => {
	try {
		return fn();
	} catch (e) {
		console.error("[pingid:iife] entry setup failed", e);
		return;
	}
};
//#endregion
export { PING, boot, bootHot };

//# sourceMappingURL=runtime.js.map