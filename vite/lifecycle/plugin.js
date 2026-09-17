import path from "node:path";
//#region lib/vite/src/lifecycle/plugin.ts
/**
* Runs side effects — codegen, a child process, a watcher — alongside vite.
*
* `start` owns the dev server's lifetime and `build` owns a one-shot build,
* which is the only difference between the two modes worth writing twice.
*/
var lifecycle = (hooks) => {
	const label = hooks.name ? `pingid:lifecycle:${hooks.name}` : "pingid:lifecycle";
	let config;
	let cleanup = null;
	return {
		name: label,
		configResolved: (config_) => void (config = config_),
		buildStart: async function() {
			if (config.command !== "build") return;
			const done = pass(config.root);
			if (this.meta.watchMode) done.clear();
			if (done.has(label)) return;
			done.add(label);
			try {
				await hooks.build({ config });
			} catch (error) {
				this.error(`[${label}] ${message(error)}`);
			}
		},
		configureServer(server) {
			if (!hooks.start) return;
			const em = emitter();
			const watch = (file, cb) => {
				const files = Array.isArray(file) ? file : [file];
				for (const file of files) server.watcher.add(path.resolve(config.root, file));
				return em.on((changed) => {
					const target = files.find((file) => path.resolve(changed).includes(file));
					if (!target) return;
					cb(target);
				});
			};
			server.watcher.on("all", (_event, changed) => em.emit(changed));
			cleanup = Promise.resolve(hooks.start({
				config,
				server,
				watch
			}));
			cleanup.catch((e) => config.logger.error(`[${label}] ${message(e)}`));
		},
		closeBundle: async () => {
			const pending = cleanup;
			if (!pending) return;
			cleanup = null;
			await pending.then((fn) => fn?.()).catch((e) => config.logger.error(`[${label}] ${message(e)}`));
		}
	};
};
/** What a single `vite build` has already run, keyed by project root. */
var passes = /* @__PURE__ */ new Map();
var pass = (root) => {
	const found = passes.get(root);
	if (found) return found;
	const next = /* @__PURE__ */ new Set();
	passes.set(root, next);
	return next;
};
var message = (error) => {
	const e = error instanceof Error ? error : new Error(String(error));
	return e.stack ?? e.message;
};
var emitter = () => {
	const listeners = /* @__PURE__ */ new Set();
	return {
		on: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		off: (listener) => listeners.delete(listener),
		emit: (...args) => Array.from(listeners).forEach((listener) => listener(...args))
	};
};
//#endregion
export { lifecycle };

//# sourceMappingURL=plugin.js.map