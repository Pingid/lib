import { Repo } from "../../workspace/git/repo.js";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createJiti } from "jiti";
//#region lib/ship/cli/load.ts
var CONFIG_CANDIDATES = [
	"stack.config.ts",
	"stack.config.mts",
	"stack.config.js",
	"stack.config.mjs"
];
var jiti = createJiti(import.meta.url, { moduleCache: false });
var load = async (configPath) => {
	const module = await jiti.import(configPath);
	const exported = module["default"] ?? module["stacks"] ?? module["config"];
	const value = await (typeof exported === "function" ? exported() : exported);
	if (value == null) throw new Error(`${configPath} has no default export`);
	return value;
};
var find = async (explicit) => {
	if (explicit) {
		const path = resolve(explicit);
		if (!existsSync(path)) throw new Error(`config not found: ${path}`);
		return path;
	}
	const found = findIn(process.cwd());
	if (found) return found;
	const repo = await Repo.discover().catch(() => void 0);
	if (repo && repo.dir !== explicit) {
		findIn(repo.dir);
		if (found) return found;
	}
	throw new Error(`no config found — looked for ${CONFIG_CANDIDATES.join(", ")} in ${process.cwd()}`);
};
var findIn = (dir = process.cwd()) => {
	for (const candidate of CONFIG_CANDIDATES) {
		const path = resolve(dir, candidate);
		if (existsSync(path)) return path;
	}
};
//#endregion
export { find, load };

//# sourceMappingURL=load.js.map