import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
//#region lib/ship/src/config/context.ts
var createContext = (config) => ({
	config,
	cwd: path.resolve(config.cwd ?? process.cwd())
});
/** The spec a stack declares, or the path it points at. */
var resolveSpec = async (stack) => typeof stack === "function" ? stack() : stack;
/** A file docker can read: a path stack as-is, anything else written to scratch. */
var resolvePath = async (ctx, stack) => {
	const spec = await resolveSpec(stack);
	if (typeof spec === "string") return path.resolve(ctx.cwd, spec);
	const file = path.join(scratch(ctx), `${spec.name}.json`);
	await fs.promises.writeFile(file, JSON.stringify(spec, null, 2));
	return file;
};
/** Made on first write, so help and `print` leave nothing behind. */
var scratch = (ctx) => ctx.temp ??= fs.mkdtempSync(path.join(tmpdir(), "ship-"));
/** Forwarded to the child; SIGINT is not, because the terminal already sent it to the whole group. */
var FORWARDED = ["SIGTERM", "SIGHUP"];
var execute = (ctx, config) => {
	const ignore = () => {};
	const forwards = /* @__PURE__ */ new Map();
	return new Promise((done, fail) => {
		const child = spawn(config.bin, config.args, {
			stdio: "inherit",
			env: config.env
		});
		process.on("SIGINT", ignore);
		for (const signal of FORWARDED) {
			const forward = () => void child.kill(signal);
			forwards.set(signal, forward);
			process.on(signal, forward);
		}
		child.on("error", fail);
		child.on("close", (code, signal) => done(code ?? (signal ? 1 : 0)));
	}).finally(() => {
		process.off("SIGINT", ignore);
		for (const [signal, forward] of forwards) process.off(signal, forward);
		cleanScratch(ctx);
	});
};
var cleanScratch = (ctx) => {
	if (ctx.temp) fs.rmSync(ctx.temp, {
		recursive: true,
		force: true
	});
	ctx.temp = void 0;
};
//#endregion
export { cleanScratch, createContext, execute, resolvePath, resolveSpec };

//# sourceMappingURL=context.js.map