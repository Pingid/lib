import { File } from "../_util/file.js";
import path from "node:path";
import fs from "node:fs";
import * as esbuild from "esbuild";
//#region lib/vite/src/iife/build.ts
/** Global the hot bundle assigns its namespace to, and which `new Function` returns. */
var IDENT = "__pingid_iife";
var BASE = {
	bundle: true,
	format: "iife",
	platform: "browser",
	target: "es2022",
	splitting: false,
	write: false,
	metafile: true,
	absPaths: ["metafile"]
};
/**
* Vite's resolution and env, as far as esbuild can express them.
*
* `conditions` is the one that bites: this package asks consumers to set
* `resolve.conditions: ['ts']`, and without forwarding it the bundle would
* resolve `@pingid/lib/vite` to `dist` while the page resolves it to `src`.
*
* `import.meta.env` is defined whole rather than key by key because under
* `format: 'iife'` esbuild rewrites a bare `import.meta` to `{}` — defining
* only `DEV`/`PROD`/`MODE` leaves every `VITE_*` var silently `undefined`.
*/
var opts = (config) => ({
	...BASE,
	absWorkingDir: config.root,
	conditions: config.resolve.conditions,
	mainFields: config.resolve.mainFields,
	resolveExtensions: config.resolve.extensions,
	sourcemap: config.command === "serve" ? "inline" : false,
	minify: config.command === "build",
	alias: aliases(config),
	define: {
		"import.meta.env": JSON.stringify(config.env),
		"process.env.NODE_ENV": JSON.stringify(config.isProduction ? "production" : "development"),
		...defines(config.define)
	}
});
var bundler = (config, shared = {}) => {
	const base = merge(opts(config), shared);
	const runtime = spec(sibling("./runtime.ts"));
	const run = async (over) => {
		const res = await esbuild.build({
			...base,
			...over
		}).catch((e) => {
			throw new Error(`[pingid:iife] bundle failed\n${format(e)}`);
		});
		for (const w of res.warnings) config.logger.warn(`[pingid:iife] ${w.text}`);
		const code = res.outputFiles?.[0]?.text;
		if (code === void 0) throw new Error("[pingid:iife] esbuild produced no output");
		return {
			code,
			deps: Object.keys(res.metafile?.inputs ?? {}).filter((f) => path.isAbsolute(f))
		};
	};
	return {
		/**
		* The outer script the browser registers: the harness with `file` inlined.
		* Built once per dev-server run so its bytes stay stable — the browser
		* byte-compares a service worker script on every `register()` and update
		* check, and changing bytes queues a fresh install behind every edit.
		*/
		shell: (file, hot) => run({ stdin: {
			contents: [
				`import { ${hot === null ? "boot" : "bootHot"} } from ${str(runtime)}`,
				`import * as mod from ${str(spec(file))}`,
				hot === null ? "boot(mod)" : `bootHot(mod, ${str(hot)})`
			].join("\n"),
			resolveDir: config.root,
			sourcefile: "pingid-iife-shell.js",
			loader: "js"
		} }),
		/** `file` alone, for `new Function(code)()` inside the already-running script. */
		unit: async (file) => {
			const out = await run({
				entryPoints: [file],
				globalName: IDENT
			});
			const url = `/@pingid/iife/${spec(path.relative(config.root, file))}`;
			return {
				...out,
				code: `${out.code}\nreturn ${IDENT}\n//# sourceURL=${url}\n`
			};
		}
	};
};
var merge = (base, over) => ({
	...base,
	...over,
	alias: {
		...base.alias,
		...over.alias
	},
	define: {
		...base.define,
		...over.define
	}
});
/** esbuild `define` takes replacement source text; vite's config takes values. */
var defines = (define) => Object.fromEntries(Object.entries(define ?? {}).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
/** Only plain-string `find` aliases can cross over; anything else is reported, not silently dropped. */
var aliases = (config) => {
	const dropped = [];
	const kept = {};
	for (const { find, replacement } of config.resolve.alias) if (typeof find === "string") kept[find] = replacement;
	else if (!INTERNAL.test(find.source)) dropped.push(String(find));
	if (dropped.length) config.logger.warn(`[pingid:iife] esbuild cannot honour regex aliases, so these are ignored inside the bundle: ${dropped.join(", ")}`);
	return kept;
};
var format = (e) => {
	const errors = e.errors;
	if (!errors?.length) return e instanceof Error ? e.message : String(e);
	return errors.map((m) => `  ${m.location ? `${m.location.file}:${m.location.line} ` : ""}${m.text}`).join("\n");
};
/**
* Path to one of this plugin's own runtime files.
*
* `import.meta` is this module's real location only while it stays a real
* module. Vite bundles a config file's *relative* imports into a temp file, so
* a plugin imported by source path from a vite config lands there and this
* resolves to nothing — worth saying out loud rather than surfacing as an
* esbuild resolve error.
*/
var sibling = (rel) => {
	const file = File.project(import.meta, rel).path;
	if (!fs.existsSync(file)) throw new Error(`[pingid:iife] cannot locate ${rel} at ${file} — import this plugin as "@pingid/lib/vite/plugin/iife" rather than by a relative path, so vite does not inline it into its bundled config`);
	return file;
};
var INTERNAL = /@vite/;
var spec = (p) => p.replaceAll("\\", "/");
var str = (s) => JSON.stringify(s);
//#endregion
export { IDENT, bundler, opts, sibling };

//# sourceMappingURL=build.js.map