import path from "node:path";
import fs from "node:fs";
import { createJiti } from "jiti";
//#region lib/ship/cli/resolve.ts
var CANDIDATES = [
	"stack.config.ts",
	"stack.config.mts",
	"stack.config.js",
	"stack.config.mjs"
];
var jiti = createJiti(import.meta.url, { moduleCache: false });
/** Evaluate a config and build every stack it declares. */
var load = async (configPath) => {
	if (!configPath) configPath = find();
	const module = await jiti.import(configPath);
	const exported = module["default"] ?? module["stacks"] ?? module["config"];
	const value = await (typeof exported === "function" ? exported() : exported);
	if (value == null) throw new Error(`${configPath} has no default export`);
	return value;
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
export { load };

//# sourceMappingURL=resolve.js.map