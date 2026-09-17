import { bundler } from "./build.js";
import { toNode } from "./node.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
//#region lib/vite/src/server/plugin.ts
/**
* Mounts a backend app inside the vite dev and preview servers.
*
* The app is loaded through vite's SSR pipeline, so it gets the same transforms
* and resolution as the rest of the project and picks up edits with no restart.
*/
var serve = (mounts, options = {}) => {
	const list = Object.entries(mounts).map(([at, input]) => {
		const it = typeof input === "string" ? { file: input } : input;
		if (!at.startsWith("/")) throw new Error(`[pingid:server] mount path ${JSON.stringify(at)} must start with "/"`);
		if (it.build && !it.preview) throw new Error(`[pingid:server] mount ${JSON.stringify(at)} sets \`build\` but no \`preview\` — \`build\` writes the entry \`preview\` reads`);
		return {
			...options,
			...it,
			at: at === "/" ? "/" : at.replace(/\/+$/, "")
		};
	});
	let config;
	/**
	* Sequential on purpose: a handful of entries at most, and interleaved
	* bundler output is worse than the wait. The first failure stops the rest.
	*/
	const produce = async (when) => {
		const done = pass(config.root);
		for (const m of list) {
			if (!m.build || !m.preview || (m.buildOrder ?? "post") !== when) continue;
			const file = path.resolve(config.root, m.file);
			const out = path.resolve(config.root, m.preview);
			const key = `${when} ${m.at}`;
			if (done.has(key) && fs.existsSync(out)) continue;
			done.add(key);
			const started = Date.now();
			const build = bundler(config, file, out, (files) => watched.set(`${config.root} ${m.at}`, files));
			try {
				await m.build({
					at: m.at,
					file,
					out,
					build,
					mount: m,
					config
				});
			} catch (error) {
				throw new Error(format(m, error));
			}
			const took = Date.now() - started;
			config.logger.info(`[pingid:server] built ${m.at} → ${path.relative(config.root, out)} in ${took}ms`);
		}
	};
	/**
	* Deliberately not cached. Re-importing is what picks up an edit, and it is
	* cheap when nothing changed: vite's watcher nulls `transformResult` only for
	* what actually changed, and the runner re-evaluates only those modules. So a
	* module's top-level state — a pool, a cache — survives across requests.
	*/
	const dev = (server, m) => {
		const file = path.resolve(config.root, m.file);
		if (m.fresh) evict(server, file);
		const runner = runnerOf(server);
		return runner ? runner.import(file) : server.ssrLoadModule(file);
	};
	const built = /* @__PURE__ */ new Map();
	const preview = (m) => {
		const file = path.resolve(config.root, m.preview);
		const href = pathToFileURL(file).href;
		if (m.fresh) return import(`${href}?t=${Date.now()}`);
		const found = built.get(file);
		if (found) return found;
		const next = import(href);
		built.set(file, next);
		return next;
	};
	const mount = (m, load) => (req, res, next) => {
		const url = route(m, req, config.base);
		if (url === null) return next();
		load().then((mod) => {
			const handler = resolve$1(m, mod);
			if (handler.kind === "node") return handler.run(req, res, next);
			return toNode(handler.run, { url: () => url })(req, res, next);
		}, (error) => fail(config, m, error, req, res, next));
	};
	const upgrades = (server, on, load) => {
		const wanted = on.filter((m) => m.upgrade);
		if (!wanted.length || !server.httpServer) return;
		server.httpServer.on("upgrade", (req, socket, head) => {
			const protocol = req.headers["sec-websocket-protocol"];
			if (protocol === "vite-hmr" || protocol === "vite-ping") return;
			const m = wanted.find((it) => route(it, req, config.base) !== null);
			if (!m) return;
			load(m).then((mod) => m.upgrade?.(mod)?.(req, socket, head), (error) => config.logger.error(format(m, error)));
		});
	};
	return {
		name: "pingid:server",
		configResolved: (config_) => void (config = config_),
		buildStart: async function() {
			if (config.command !== "build") return;
			if (this.meta.watchMode) {
				passes.delete(config.root);
				for (const m of list) {
					if (!m.build || !m.preview) continue;
					this.addWatchFile(path.resolve(config.root, m.file));
					for (const file of watched.get(`${config.root} ${m.at}`) ?? []) this.addWatchFile(file);
				}
			}
			try {
				await produce("pre");
			} catch (error) {
				this.error(error instanceof Error ? error.message : String(error));
			}
		},
		closeBundle: async function() {
			if (config.command !== "build") return;
			try {
				await produce("post");
			} catch (error) {
				this.error(error instanceof Error ? error.message : String(error));
			}
		},
		configureServer(server) {
			const [root, prefixed] = split(list);
			for (const m of prefixed) server.middlewares.use(mount(m, () => dev(server, m)));
			upgrades(server, list, (m) => dev(server, m));
			if (!root.length) return;
			return () => {
				for (const m of root) server.middlewares.use(mount(m, () => dev(server, m)));
			};
		},
		configurePreviewServer(server) {
			for (const m of list.filter((it) => !it.preview)) config.logger.warn(`[pingid:server] "${m.at}" is not mounted in preview — set \`preview\` to its built server entry`);
			const mountable = list.filter((m) => m.preview);
			const [root, prefixed] = split(mountable);
			for (const m of prefixed) server.middlewares.use(mount(m, () => preview(m)));
			upgrades(server, mountable, (m) => preview(m));
			if (!root.length) return;
			return () => {
				for (const m of root) server.middlewares.use(mount(m, () => preview(m)));
			};
		}
	};
};
/**
* What a single `vite build` has already produced, keyed by project root.
*
* Vite 6+ builds once per environment and re-resolves the config for each,
* which re-imports the config file, re-runs `serve` and hands every environment
* its own plugin instance — so a closure cannot see what a sibling already did.
* This module is imported once per process, so this can.
*
* Not `applyToEnvironment` (absent before vite 6) and not a test for `client`,
* which would silently skip a build that has no client environment, such as
* `vite build --ssr`.
*/
var passes = /* @__PURE__ */ new Map();
var pass = (root) => {
	const found = passes.get(root);
	if (found) return found;
	const next = /* @__PURE__ */ new Set();
	passes.set(root, next);
	return next;
};
/** Per root and mount, every file its last bundle read — the watch list for the next rebuild. */
var watched = /* @__PURE__ */ new Map();
var split = (list) => [list.filter((m) => m.at === "/"), list.filter((m) => m.at !== "/")];
/**
* Nulls the transform result for the entry and everything below it, which is
* what makes the next import re-transform and re-evaluate: the SSR runner
* discards its evaluated copy of any module vite reports as invalidated.
*
* `invalidateModule` already walks *importers* on its own; the recursion here
* goes the other way, down through `importedModules`.
*
* Externalized dependencies are untouched — they never enter this graph, and
* Node's ESM cache holds them regardless. So `fresh` resets your code, not the
* whole world.
*/
var evict = (server, file) => {
	const graph = graphOf(server);
	const roots = graph?.getModulesByFile?.(file);
	if (!graph || !roots) return;
	const seen = /* @__PURE__ */ new Set();
	const drop = (mod) => {
		if (seen.has(mod)) return;
		seen.add(mod);
		graph.invalidateModule(mod);
		for (const dep of mod.importedModules) drop(dep);
	};
	for (const root of roots) drop(root);
};
var graphOf = (server) => {
	return server.environments?.["ssr"]?.moduleGraph ?? server.moduleGraph;
};
/**
* Structural, not `isRunnableDevEnvironment`: that export doesn't exist before
* vite 6 so a static import would hard-fail there, and it is an `instanceof`
* check, which breaks across duplicated vite copies in a workspace.
*/
var runnerOf = (server) => {
	const runner = server.environments?.["ssr"]?.runner;
	return typeof runner?.import === "function" ? runner : void 0;
};
/**
* The path to hand the app, or `null` if this mount doesn't claim the request.
*
* Reads `originalUrl` because by the time a post-hook middleware runs, `req.url`
* has been through `baseMiddleware` (base stripped) and possibly
* `htmlFallbackMiddleware` (rewritten to `/index.html` for an HTML navigation).
* `originalUrl` is set once at dispatch and survives both.
*/
var route = (m, req, base) => {
	const raw = req.originalUrl ?? req.url ?? "/";
	const q = raw.indexOf("?");
	const search = q === -1 ? "" : raw.slice(q);
	let pathname = q === -1 ? raw : raw.slice(0, q);
	if (base !== "/" && pathname.startsWith(base.slice(0, -1))) pathname = pathname.slice(base.length - 1) || "/";
	if (m.at === "/") return pathname + search;
	if (pathname !== m.at && !pathname.startsWith(`${m.at}/`)) return null;
	return (m.strip ? pathname.slice(m.at.length) || "/" : pathname) + search;
};
/**
* Detection is standards-only — a bare function, or the `{ fetch }` shape
* Cloudflare, Bun and Deno share. Anything framework-specific (Elysia's
* `handle`, Express's `handle`) is one line of `handler`, kept out of here so
* this module carries no library knowledge.
*/
var resolve$1 = (m, mod) => {
	const found = m.handler ? m.handler(mod) : detect(m, mod);
	const kind = m.kind ?? (found.length >= 2 ? "node" : "fetch");
	return kind === "node" ? {
		kind,
		run: found
	} : {
		kind,
		run: found
	};
};
var detect = (m, mod) => {
	const name = m.export ?? "default";
	const value = mod?.[name];
	if (typeof value === "function") return value;
	const fetch = value?.fetch;
	if (typeof fetch === "function") return fetch.bind(value);
	throw new Error(`[pingid:server] "${m.file}" has nothing usable on export "${name}" — expected a function, or an object with a \`fetch\` method. For anything else pass \`handler\`, e.g. \`handler: (m) => (r) => m.default.handle(r)\``);
};
var fail = (config, m, error, req, res, next) => {
	if (m.onError) return m.onError(error, req, res, next);
	config.logger.error(format(m, error));
	if (res.headersSent) return res.destroy(error instanceof Error ? error : new Error(String(error)));
	res.statusCode = 500;
	res.setHeader("Content-Type", "text/plain; charset=utf-8");
	res.end(format(m, error));
};
var format = (m, error) => {
	const e = error instanceof Error ? error : new Error(String(error));
	return `[pingid:server] ${m.at} — ${e.stack ?? e.message}`;
};
//#endregion
export { serve };

//# sourceMappingURL=plugin.js.map