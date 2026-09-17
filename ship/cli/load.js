import { ContextValue } from "../context.js";
import { Stack } from "../stack.js";
import { Project } from "../project.js";
import "../index.js";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createJiti } from "jiti";
//#region lib/ship/cli/load.ts
var CANDIDATES = [
	"stack.config.ts",
	"stack.config.mts",
	"stack.config.js",
	"stack.config.mjs"
];
/** Docker commands that own the user's terminal; these get a real file so stdin stays theirs. */
var INTERACTIVE = /* @__PURE__ */ new Set([
	"exec",
	"run",
	"attach"
]);
/**
* Loads configs with the module cache off, so every call re-evaluates the whole graph rather
* than replaying node's copy. jiti also transpiles TypeScript, so a `.ts` config does not
* depend on the running node being new enough to strip types.
*
* One caveat: jiti transforms TypeScript wherever it finds it, so a config that imports this
* library's *sources* gets its own copy of them, and the `instanceof` checks below — which
* compare against the copy the CLI was built with — will not recognise what it exports.
* Importing the built package, as a consumer does, keeps one shared copy.
*/
var jiti = createJiti(import.meta.url, { moduleCache: false });
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
/** Evaluate a config and build every stack it declares. */
var load = async (configPath) => {
	const module = await jiti.import(configPath);
	const exported = module["default"] ?? module["stacks"] ?? module["config"];
	const value = await (typeof exported === "function" ? exported() : exported);
	if (value == null) throw new Error(`${configPath} has no default export`);
	return Project.build(...entries(value));
};
/**
* The shapes a config may export: one stack, a list of stacks and context values, or a
* record of stacks whose `$provide` carries the values shared across all of them.
*/
var entries = (value) => {
	if (value instanceof Stack || value instanceof ContextValue) return [value];
	if (Array.isArray(value)) return value;
	const { $provide = [], ...stacks } = value;
	return [...$provide, ...Object.values(stacks)];
};
var write = async (spec, file) => {
	await fs.promises.mkdir(path.dirname(file), { recursive: true });
	await fs.promises.writeFile(file, `${JSON.stringify(spec, null, 2)}\n`);
};
/**
* Run docker with the generated file supplied on stdin — compose accepts JSON because YAML
* is a superset of it, so nothing here depends on a YAML writer.
*
* `exec`/`run`/`attach` need the user's stdin for themselves, so for those the spec goes to a
* temp file and `-` in the arguments is rewritten to point at it.
*/
var docker = (args, spec, command) => {
	const interactive = INTERACTIVE.has(command);
	let scratch;
	let full = args;
	if (interactive) {
		scratch = fs.mkdtempSync(path.join(tmpdir(), "ship-"));
		const file = path.join(scratch, "compose.json");
		fs.writeFileSync(file, JSON.stringify(spec));
		full = args.map((arg) => arg === "-" ? file : arg);
	}
	return new Promise((done, fail) => {
		const child = spawn("docker", full, { stdio: interactive ? "inherit" : [
			"pipe",
			"inherit",
			"inherit"
		] });
		child.on("error", fail);
		child.on("close", (code, signal) => done(code ?? (signal ? 1 : 0)));
		if (!interactive && child.stdin) {
			child.stdin.on("error", () => {});
			child.stdin.end(JSON.stringify(spec));
		}
	}).finally(() => {
		if (scratch) fs.rmSync(scratch, {
			recursive: true,
			force: true
		});
	});
};
//#endregion
export { docker, find, load, write };

//# sourceMappingURL=load.js.map