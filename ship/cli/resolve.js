import path from "node:path";
import fs from "node:fs";
import { createJiti } from "jiti";
//#region lib/ship/cli/resolve.ts
var CANDIDATES = [
	"ship.config.ts",
	"ship.config.mts",
	"ship.config.js",
	"ship.config.mjs",
	"stack.config.ts",
	"stack.config.mts",
	"stack.config.js",
	"stack.config.mjs"
];
var jiti = createJiti(import.meta.url, { moduleCache: false });
/** Evaluate a config; relative paths in its stacks resolve against the file's directory. */
var load = async (configPath) => {
	const file = find(configPath);
	const module = await jiti.import(file);
	const exported = module["default"] ?? module["stacks"] ?? module["config"];
	const value = await (typeof exported === "function" ? exported() : exported);
	if (value == null) throw new Error(`${file} has no default export`);
	const config = value;
	return {
		...config,
		cwd: path.resolve(path.dirname(file), config.cwd ?? ".")
	};
};
/**
* Split ship's own `--config` off argv. Only flags ahead of the first word are ship's — after
* the stack or command, everything belongs to docker, `-c` included.
*/
var configOf = (argv) => {
	let file;
	let index = 0;
	for (; index < argv.length; index++) {
		const token = argv[index];
		if (token === "-c" || token === "--config") file = argv[++index];
		else if (token.startsWith("--config=")) file = token.slice(9);
		else if (token.startsWith("-c") && !token.startsWith("--")) file = token.slice(2);
		else break;
	}
	return {
		file,
		rest: argv.slice(index)
	};
};
/** The explicit path, or the nearest config at or above the working directory. */
var find = (explicit) => {
	if (explicit) {
		const pth = path.resolve(explicit);
		if (!fs.existsSync(pth)) throw new Error(`config not found: ${pth}`);
		return pth;
	}
	for (let dir = process.cwd(), up = path.dirname(dir);; dir = up, up = path.dirname(dir)) {
		for (const candidate of CANDIDATES) {
			const pth = path.resolve(dir, candidate);
			if (fs.existsSync(pth)) return pth;
		}
		if (up === dir) break;
	}
	throw new Error(`no config found — looked for ${CANDIDATES.join(", ")} in ${process.cwd()} and its parents`);
};
//#endregion
export { configOf, load };

//# sourceMappingURL=resolve.js.map