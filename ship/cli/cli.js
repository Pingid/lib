#!/usr/bin/env node
import { Stack } from "../stack.js";
import { Project } from "../project.js";
import "../index.js";
import { formatProblems, validate } from "./validate.js";
import { basename, dirname, join, resolve } from "node:path";
import { existsSync, mkdtempSync, rmSync, watch, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createJiti } from "jiti";
//#region lib/ship/cli/cli.ts
var CONFIG_CANDIDATES = [
	"stack.config.ts",
	"stack.config.mts",
	"stack.config.js",
	"stack.config.mjs"
];
/** Docker commands that tear down, and so run in reverse dependency order. */
var REVERSED = /* @__PURE__ */ new Set([
	"down",
	"stop",
	"kill",
	"rm"
]);
/** Docker commands that own the user's terminal; these get a temp file so stdin stays theirs. */
var INTERACTIVE = /* @__PURE__ */ new Set([
	"exec",
	"run",
	"attach"
]);
/** Handled here rather than passed to docker. */
var LOCAL = /* @__PURE__ */ new Set([
	"ls",
	"build",
	"check",
	"help",
	"--help",
	"-h"
]);
var parse = (argv) => {
	const options = {
		command: "help",
		stacks: [],
		validate: true,
		watch: false,
		dryRun: false,
		dockerArgs: []
	};
	const rest = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--") {
			options.dockerArgs.push(...argv.slice(i + 1));
			break;
		}
		const next = () => {
			const value = argv[++i];
			if (value === void 0) throw new Error(`${arg} expects a value`);
			return value;
		};
		if (arg === "-c" || arg === "--config") options.config = next();
		else if (arg === "-s" || arg === "--stack") options.stacks.push(next());
		else if (arg === "--project-dir" || arg === "--project-directory") options.projectDir = next();
		else if (arg === "--out" || arg === "-o") options.out = next();
		else if (arg === "--no-validate") options.validate = false;
		else if (arg === "--watch") options.watch = true;
		else if (arg === "--dry-run") options.dryRun = true;
		else rest.push(arg);
	}
	options.command = rest.shift() ?? options.dockerArgs.shift() ?? "help";
	if (LOCAL.has(options.command)) options.stacks.push(...rest);
	else options.dockerArgs.unshift(...rest);
	return options;
};
var findConfig = (explicit) => {
	if (explicit) {
		const path = resolve(explicit);
		if (!existsSync(path)) throw new Error(`config not found: ${path}`);
		return path;
	}
	for (const candidate of CONFIG_CANDIDATES) {
		const path = resolve(candidate);
		if (existsSync(path)) return path;
	}
	throw new Error(`no config found — looked for ${CONFIG_CANDIDATES.join(", ")} in ${process.cwd()}`);
};
/**
* Loads configs, with the module cache off so every call re-evaluates the whole graph.
*
* That is what lets `--watch` reload in-process: node's own loader caches a module for the life
* of the process, and a cache-busting query string only ever busts the config itself, leaving
* an edit to a file it imports invisible. jiti also transpiles TypeScript, so a `.ts` config no
* longer depends on the running node being new enough to strip types.
*
* Specifiers resolve from the config's own directory, so a config picks up its dependencies
* from the project it lives in. One caveat comes with re-evaluation: jiti transforms TypeScript
* wherever it finds it, so a config that imports this library's *sources* gets its own copy of
* them, and the `instanceof` checks below — which compare against the copy the CLI was built
* with — will not recognise what it exports. Importing the built package, as a consumer does,
* stays on node's loader and keeps one shared copy.
*/
var jiti = createJiti(import.meta.url, { moduleCache: false });
var load = async (configPath) => {
	const module = await jiti.import(configPath);
	const exported = module["default"] ?? module["stacks"] ?? module["config"];
	const value = await (typeof exported === "function" ? exported() : exported);
	if (value == null) throw new Error(`${configPath} has no default export`);
	if (value instanceof Stack) return Project.build(value);
	if (Array.isArray(value)) return Project.build(...value);
	if (typeof value === "object" && "specs" in value && "order" in value) return value;
	const spec = value;
	const name = spec.name ?? basename(dirname(configPath));
	return {
		order: [name],
		edges: [],
		specs: { [name]: spec },
		projects: { [name]: name }
	};
};
var select = (built, names) => {
	if (names.length === 0) return built.order;
	for (const name of names) if (!(name in built.specs)) throw new Error(`unknown stack "${name}" — have: ${Object.keys(built.specs).join(", ")}`);
	return built.order.filter((n) => names.includes(n));
};
/** Report reference problems; returns the number of errors. */
var check = (built, names) => {
	let errors = 0;
	for (const name of names) {
		const problems = validate(built.specs[name]);
		if (problems.length > 0) process.stderr.write(`${formatProblems(problems, `[${name}]`)}\n`);
		errors += problems.filter((p) => p.level === "error").length;
	}
	return errors;
};
var docker = (args, spec, options) => {
	const interactive = INTERACTIVE.has(options.command);
	if (options.dryRun) {
		const shown = interactive ? args.map((a) => a === "-" ? "<compose.json>" : a) : args;
		process.stdout.write(`docker ${shown.join(" ")}\n`);
		return Promise.resolve(0);
	}
	let scratch;
	let full = args;
	if (interactive) {
		scratch = mkdtempSync(join(tmpdir(), "stack-"));
		const file = join(scratch, "compose.json");
		writeFileSync(file, JSON.stringify(spec));
		full = args.map((a) => a === "-" ? file : a);
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
		if (scratch) rmSync(scratch, {
			recursive: true,
			force: true
		});
	});
};
var run = async (built, options, projectDir) => {
	const names = select(built, options.stacks);
	const tearingDown = REVERSED.has(options.command);
	const ordered = tearingDown ? [...names].reverse() : names;
	if (options.validate && !tearingDown) {
		const errors = check(built, names);
		if (errors > 0) throw new Error(`${errors} reference error(s) — pass --no-validate to run anyway`);
	}
	let code = 0;
	for (const name of ordered) {
		const result = await docker([
			"compose",
			"--project-name",
			built.projects[name],
			"--project-directory",
			projectDir,
			"-f",
			"-",
			options.command,
			...options.dockerArgs
		], built.specs[name], options);
		if (result !== 0) {
			code = result;
			if (!tearingDown) break;
		}
	}
	return code;
};
var usage = `Usage: stack <command> [stack...] [options] [-- docker args]

Commands
  ls                    stacks, their resources and dependency order
  build [stack...]      print the generated compose file(s) as JSON
  check [stack...]      validate references, then run \`docker compose config -q\`
  <docker command>      anything else is passed to \`docker compose\` with the
                        generated file on stdin: up -d, down, logs -f, ps, exec api sh

Options
  -c, --config <path>   config file (default: ${CONFIG_CANDIDATES.join(", ")})
  -s, --stack <name>    limit to one stack (repeatable)
      --project-dir <p> --project-directory for docker (default: the config's directory)
  -o, --out <file>      write build output to a file
      --no-validate     skip the reference check
      --watch           with \`up\`: re-generate and re-converge on change
      --dry-run         print the docker commands instead of running them
`;
var main = async () => {
	const options = parse(process.argv.slice(2));
	if (options.command === "help" || options.command === "--help" || options.command === "-h") {
		process.stdout.write(usage);
		return 0;
	}
	const configPath = findConfig(options.config);
	const projectDir = resolve(options.projectDir ?? dirname(configPath));
	let built = await load(configPath);
	if (options.command === "ls") {
		for (const name of built.order) {
			const spec = built.specs[name];
			const counts = [
				"services",
				"networks",
				"volumes",
				"secrets",
				"configs"
			].map((group) => [group, Object.keys(spec[group] ?? {}).length]).filter(([, n]) => n > 0).map(([group, n]) => `${n} ${n === 1 ? group.slice(0, -1) : group}`).join(", ");
			const deps = built.edges.filter(([, to]) => to === name).map(([from]) => from);
			process.stdout.write(`${name}  (project: ${built.projects[name]})  ${counts}${deps.length ? `  after: ${deps.join(", ")}` : ""}\n`);
		}
		return 0;
	}
	if (options.command === "build") {
		const names = select(built, options.stacks);
		const payload = names.length === 1 ? built.specs[names[0]] : Object.fromEntries(names.map((n) => [n, built.specs[n]]));
		const json = `${JSON.stringify(payload, null, 2)}\n`;
		if (options.out) writeFileSync(resolve(options.out), json);
		else process.stdout.write(json);
		return 0;
	}
	if (options.command === "check") {
		const names = select(built, options.stacks);
		let code = check(built, names) > 0 ? 1 : 0;
		for (const name of names) {
			const result = await docker([
				"compose",
				"--project-name",
				built.projects[name],
				"--project-directory",
				projectDir,
				"-f",
				"-",
				"config",
				"--quiet"
			], built.specs[name], options);
			if (result !== 0) code = result;
		}
		return code;
	}
	if (!options.watch) return run(built, options, projectDir);
	let running = false;
	let queued = false;
	const converge = async () => {
		if (running) {
			queued = true;
			return;
		}
		running = true;
		try {
			built = await load(configPath);
			await run(built, options, projectDir);
		} catch (error) {
			process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		} finally {
			running = false;
			if (queued) {
				queued = false;
				converge();
			}
		}
	};
	let timer;
	watch(dirname(configPath), { recursive: true }, (_event, file) => {
		if (file && /(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(String(file))) return;
		clearTimeout(timer);
		timer = setTimeout(() => void converge(), 150);
	});
	process.stderr.write(`watching ${dirname(configPath)} — ctrl-c to stop\n`);
	await converge();
	return new Promise(() => {});
};
main().then((code) => {
	process.exitCode = code;
}, (error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
});
//#endregion

//# sourceMappingURL=cli.js.map