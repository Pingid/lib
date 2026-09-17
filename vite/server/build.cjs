const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
let node_path = require("node:path");
node_path = require_runtime.__toESM(node_path, 1);
let esbuild = require("esbuild");
esbuild = require_runtime.__toESM(esbuild, 1);
//#region lib/vite/src/server/build.ts
/**
* Vite's resolution and env, as far as esbuild can express them, aimed at node.
*
* Deliberately not `src/iife/build.ts`'s `opts()`: that one bundles for the
* browser as an IIFE, keeps its output in memory, minifies on build and freezes
* `import.meta.env` into the bundle — every one of which is wrong for a server
* entry that runs under node and reads its environment at runtime.
*/
var opts = (config, file, out) => ({
	entryPoints: [file],
	outfile: out,
	bundle: true,
	platform: "node",
	format: "esm",
	target: `node${process.versions.node.split(".")[0] ?? "18"}`,
	packages: "external",
	sourcemap: true,
	metafile: true,
	absPaths: ["metafile"],
	logLevel: "silent",
	absWorkingDir: config.root,
	conditions: conditions(config),
	resolveExtensions: config.resolve.extensions,
	alias: aliases(config),
	define: {
		"process.env.NODE_ENV": JSON.stringify(config.isProduction ? "production" : "development"),
		...defines(config.define)
	}
});
/** `deps` receives every absolute path esbuild read, which is what `--watch` needs to see. */
var bundler = (config, file, out, deps = () => {}) => {
	const base = opts(config, file, out);
	return async (over = {}) => {
		const res = await esbuild.build(merge(base, over)).catch((e) => {
			throw new Error(`bundle failed\n${format(e)}`);
		});
		for (const w of res.warnings) config.logger.warn(`[pingid:server] ${w.text}`);
		deps(Object.keys(res.metafile?.inputs ?? {}).filter((f) => node_path.default.isAbsolute(f)));
		return res;
	};
};
var merge = (base, over) => {
	const next = {
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
	};
	if (over.outdir) delete next.outfile;
	if (over.stdin) delete next.entryPoints;
	return next;
};
/**
* The SSR environment's conditions, which are the ones that describe node —
* read structurally because they moved: `environments.ssr.resolve` in vite 6+,
* `ssr.resolve` before that, and neither on very old vite.
*/
var conditions = (config) => {
	return config.environments?.["ssr"]?.resolve?.conditions ?? config.ssr?.resolve?.conditions ?? config.resolve.conditions;
};
/** esbuild `define` takes replacement source text; vite's config takes values. */
var defines = (define) => Object.fromEntries(Object.entries(define ?? {}).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
/** Only plain-string `find` aliases can cross over; anything else is reported, not silently dropped. */
var aliases = (config) => {
	const dropped = [];
	const kept = {};
	for (const { find, replacement } of config.resolve.alias) if (typeof find === "string") kept[find] = replacement;
	else if (!INTERNAL.test(find.source)) dropped.push(String(find));
	if (dropped.length) config.logger.warn(`[pingid:server] esbuild cannot honour regex aliases, so these are ignored inside the bundle: ${dropped.join(", ")}`);
	return kept;
};
var format = (e) => {
	const errors = e.errors;
	if (!errors?.length) return e instanceof Error ? e.message : String(e);
	return errors.map((m) => `  ${m.location ? `${m.location.file}:${m.location.line} ` : ""}${m.text}`).join("\n");
};
var INTERNAL = /@vite/;
//#endregion
exports.bundler = bundler;

//# sourceMappingURL=build.cjs.map