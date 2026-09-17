#!/usr/bin/env node
import { run } from "../config/run.js";
import "../config/index.js";
import { configOf, load } from "./resolve.js";
//#region lib/ship/cli/index.ts
var { file, rest } = configOf(process.argv.slice(2));
try {
	const config = await load(file);
	process.exitCode = await run({
		...config,
		argv: config.argv ?? rest
	});
} catch (error) {
	process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
}
//#endregion

//# sourceMappingURL=index.js.map