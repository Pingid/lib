import path from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import fs from "node:fs";
//#region lib/ship/src/config/context.ts
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
//#endregion
export { cleanScratch, createContext, execute, resolvePath };

//# sourceMappingURL=context.js.map