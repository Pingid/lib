import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import path from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import fs from "node:fs";
//#region lib/ship/src/config/index.ts
var config_exports = /* @__PURE__ */ __exportAll({
	cli: () => cli,
	define: () => define
});
var define = (config) => config;
var cli = async (config) => {
	const ctx = createContext(config);
	const args = config.argv ?? process.argv.slice(2);
	const stackNames = Object.keys(config.stacks);
	if (args.length === 0) throw new Error("Help not yet implemented");
	let stackName = args.length > 0 && config.stacks[args[0]] ? (args.shift(), args[0]) : config.default;
	if (!stackName && stackNames.length === 1) stackName = stackNames[0];
	if (!stackName || !config.stacks[stackName]) throw new Error(`Stack ${stackName} not found`);
	const cmd = commands[args[0]];
	if (cmd) {
		args.shift();
		throw new Error(`Command ${cmd} not yet implemented`);
	}
	const file = await resolvePath(ctx, config.stacks[stackName]);
	return execute(ctx, {
		bin: ctx.config.bin ?? "docker",
		env: {
			...process.env,
			...ctx.config.env ?? {}
		},
		args: [
			...ctx.config.defaultArgs ?? ["compose"],
			"-f",
			file,
			...ctx.config.argv ?? process.argv.slice(2)
		]
	});
};
var createContext = (config) => ({
	config,
	temp: fs.mkdtempSync(path.join(tmpdir(), "ship-"))
});
var resolvePath = async (ctx, stack) => {
	if (typeof stack === "string") return stack;
	if (typeof stack === "function") return storeScratch(ctx, stack());
	return storeScratch(ctx, stack);
};
var storeScratch = async (ctx, stack) => {
	const st = await stack;
	const scratch = path.join(ctx.temp, `${st.name}.json`);
	await fs.promises.writeFile(scratch, JSON.stringify(st, null, 2));
	return scratch;
};
var execute = (ctx, config) => {
	return new Promise((done, fail) => {
		const child = spawn(config.bin, config.args, {
			stdio: "inherit",
			env: config.env
		});
		child.on("error", fail);
		child.on("close", (code, signal) => done(code ?? (signal ? 1 : 0)));
	}).finally(() => cleanScratch(ctx));
};
var cleanScratch = (ctx) => {
	for (const file of fs.readdirSync(ctx.temp)) fs.rmSync(path.join(ctx.temp, file), {
		recursive: true,
		force: true
	});
};
var commands = { diff: { run: (_ctx, _config) => {} } };
//#endregion
export { cli, config_exports, define };

//# sourceMappingURL=index.js.map